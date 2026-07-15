import jwt from "jsonwebtoken";
import { prisma } from "../config/db.js";
import config from "../config/index.js";
import { sendInviteEmail } from "../utils/email.service.js";
import logger from "../utils/logger.js";

// ── Send Invite ───────────────────────────────────────────────────

export const inviteStaff = async (ownerId, { email, role }) => {
    // Find restaurant by ownerId instead of relying on JWT
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId, isActive: true } });
    if (!restaurant) {
        const err = new Error("You must create a restaurant first");
        err.statusCode = 404;
        err.code = "NO_RESTAURANT";
        throw err;
    }

    const restaurantId = restaurant.id; // ← extract here, use everywhere below

    // Check if there's already a pending invite for this email
    const existing = await prisma.staffInvite.findFirst({
        where: { restaurantId, email, status: "pending" },
    });

    if (existing && existing.expiresAt > new Date()) {
        const err = new Error("A pending invite already exists for this email");
        err.statusCode = 409;
        err.code = "INVITE_EXISTS";
        throw err;
    }

    // Generate invite JWT token (expires in 48 hours)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const token = jwt.sign(
        { restaurantId, email, role, type: "staff_invite" }, // ← now defined
        config.jwt.inviteSecret,
        { expiresIn: "48h" }
    );

    // Save invite in DB (upsert — replace expired invite for same email)
    const invite = await prisma.staffInvite.upsert({
        where: { token: existing?.token || "" },
        update: { token, status: "pending", expiresAt },
        create: { restaurantId, email, role, token, expiresAt }, // ← now defined
    });

    // Send invite email
    const inviteUrl = `${config.app.frontendUrl}/accept-invite?token=${token}`;
    await sendInviteEmail({ to: email, restaurantName: restaurant.name, role, inviteUrl });

    logger.info("Staff invite sent", { restaurantId, email, role });

    return { invite: { id: invite.id, email, role, expiresAt } };
};

// ── Validate Invite Token ─────────────────────────────────────────

export const validateInviteToken = async (token) => {
    // Verify JWT signature + expiry
    let decoded;
    try {
        decoded = jwt.verify(token, config.jwt.inviteSecret);
    } catch {
        const err = new Error("Invalid or expired invite link");
        err.statusCode = 400;
        err.code = "INVALID_INVITE_TOKEN";
        throw err;
    }

    if (decoded.type !== "staff_invite") {
        const err = new Error("Invalid invite token type");
        err.statusCode = 400;
        err.code = "INVALID_INVITE_TOKEN";
        throw err;
    }

    // Check invite still pending in DB
    const invite = await prisma.staffInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "pending") {
        const err = new Error("Invite has already been used or expired");
        err.statusCode = 400;
        err.code = "INVITE_USED";
        throw err;
    }

    return { email: decoded.email, role: decoded.role, restaurantId: decoded.restaurantId };
};

// ── Accept Invite ─────────────────────────────────────────────────

export const acceptInvite = async ({ token, name, password }) => {
    // Validate token
    const { email, role, restaurantId } = await validateInviteToken(token);

    // Call auth-service to create the user
    const authResponse = await fetch(`${config.services.auth}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, restaurantId }),
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
        const err = new Error(authData.message || "Failed to create user account");
        err.statusCode = authResponse.status;
        err.code = authData.code || "AUTH_SERVICE_ERROR";
        throw err;
    }

    const userId = authData.data.user.id;

    // Link staff to restaurant + mark invite accepted (atomic transaction)
    const [staff] = await prisma.$transaction([
        prisma.staff.create({
            data: { restaurantId, userId, role },
        }),
        prisma.staffInvite.update({
            where: { token },
            data: { status: "accepted" },
        }),
    ]);

    logger.info("Staff invite accepted", { userId, restaurantId, role });

    return {
        staff,
        user: authData.data.user,
        accessToken: authData.data.accessToken,
        refreshToken: authData.data.refreshToken,
    };
};

// ── Get Staff ─────────────────────────────────────────────────────

export const getStaffByRestaurant = async (ownerId) => {
    const restaurant = await getRestaurantByOwner(ownerId);

    const staffList = await prisma.staff.findMany({
        where: { restaurantId: restaurant.id, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, userId: true, role: true, createdAt: true }, // ← no user here
    });

    // Fetch user details from auth-service for each staff member
    const staffWithUsers = await Promise.all(
        staffList.map(async (staff) => {
            try {
                const res = await fetch(
                    `${config.services.auth}/api/v1/auth/internal/user/${staff.userId}`,
                    { headers: { "X-Internal-Api-Key": config.internalApiKey } }
                );
                const data = await res.json();
                return {
                    id: staff.id,
                    role: staff.role,
                    createdAt: staff.createdAt,
                    user: data.success ? data.data.user : { id: staff.userId },
                };
            } catch {
                return {
                    id: staff.id,
                    role: staff.role,
                    createdAt: staff.createdAt,
                    user: { id: staff.userId },
                };
            }
        })
    );

    return staffWithUsers;
};

const getRestaurantByOwner = async (ownerId) => {
    const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId, isActive: true },
    });
    if (!restaurant) {
        const err = new Error("You must create a restaurant first");
        err.statusCode = 404;
        err.code = "NO_RESTAURANT";
        throw err;
    }
    return restaurant;
};

export const removeStaff = async (staffId, ownerId) => {
    const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId, isActive: true },
    });
    if (!restaurant) {
        const err = new Error("You must create a restaurant first");
        err.statusCode = 404;
        err.code = "NO_RESTAURANT";
        throw err;
    }

    const staff = await prisma.staff.findFirst({
        where: { id: staffId, restaurantId: restaurant.id },
    });
    if (!staff) {
        const err = new Error("Staff member not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return prisma.staff.update({ where: { id: staffId }, data: { isActive: false } });
};

// ── Get Pending Invites ───────────────────────────────────────────

export const getPendingInvites = async (ownerId) => {
    // Find restaurant by ownerId first
    const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId, isActive: true },
    });

    if (!restaurant) {
        const err = new Error("You must create a restaurant first");
        err.statusCode = 404;
        err.code = "NO_RESTAURANT";
        throw err;
    }

    return prisma.staffInvite.findMany({
        where: { restaurantId: restaurant.id, status: "pending", expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });
};

// ── Cancel Invite ─────────────────────────────────────────────────

export const cancelInvite = async (inviteId, ownerId) => {
    // Find restaurant by ownerId first
    const restaurant = await prisma.restaurant.findFirst({
        where: { ownerId, isActive: true },
    });

    if (!restaurant) {
        const err = new Error("Restaurant not found");
        err.statusCode = 404;
        err.code = "NO_RESTAURANT";
        throw err;
    }

    const invite = await prisma.staffInvite.findFirst({
        where: { id: inviteId, restaurantId: restaurant.id }, // ← restaurant.id not null
    });

    if (!invite) {
        const err = new Error("Invite not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    return prisma.staffInvite.update({
        where: { id: inviteId },
        data: { status: "expired" },
    });
};
