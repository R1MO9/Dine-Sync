import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import config from "../config/index.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

// ── Register ──────────────────────────────────────────────────────
export const registerUser = async ({ name, email, password, role }) => {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        const err = new Error("Email is already registered");
        err.statusCode = 409;
        err.code = "EMAIL_TAKEN";
        throw err;
    }

    const hashed = await bcrypt.hash(password, config.bcrypt.saltRounds);

    const user = await prisma.user.create({
        data: { name, email, password: hashed, role },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            restaurantId: true,
            createdAt: true,
        },
    });

    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Persist refresh token
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    });

    return { user, accessToken, refreshToken };
};

// ── Login ─────────────────────────────────────────────────────────
export const loginUser = async ({ email, password }) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        err.code = "INVALID_CREDENTIALS";
        throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        err.code = "INVALID_CREDENTIALS";
        throw err;
    }

    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Persist refresh token
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
};

// ── Refresh Token ─────────────────────────────────────────────────
export const refreshAccessToken = async (token) => {
    // Verify token signature
    try {
        verifyRefreshToken(token);
    } catch {
        const err = new Error("Invalid or expired refresh token");
        err.statusCode = 401;
        err.code = "INVALID_REFRESH_TOKEN";
        throw err;
    }

    // Check it exists in DB (not revoked)
    const stored = await prisma.refreshToken.findUnique({
        where: { token },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    role: true,
                    restaurantId: true,
                    isActive: true,
                },
            },
        },
    });
    if (!stored || stored.expiresAt < new Date() || !stored.user?.isActive) {
        const err = new Error("Refresh token has been revoked or expired");
        err.statusCode = 401;
        err.code = "REFRESH_TOKEN_EXPIRED";
        throw err;
    }

    // Issue new access token
    const accessToken = generateAccessToken({
        userId: stored.user.id,
        email: stored.user.email,
        role: stored.user.role,
        restaurantId: stored.user.restaurantId,
    });

    return { accessToken };
};

// ── Logout ────────────────────────────────────────────────────────
export const logoutUser = async (userId) => {
    // Revoke all refresh tokens for this user (logout from all devices)
    await prisma.refreshToken.deleteMany({ where: { userId } });
};

// ── Get Me ────────────────────────────────────────────────────────
export const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            restaurantId: true,
            createdAt: true,
        },
    });

    if (!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        err.code = "USER_NOT_FOUND";
        throw err;
    }

    return user;
};

// ── Internal: Link Restaurant to Owner/Staff ──────────────────────
// Used both when an owner creates a restaurant and when a staff invite is
// accepted (see restaurant-service's staff.service.js) — any non-customer
// role can be linked to a restaurant, since that's what scopes their JWT's
// restaurantId claim for every downstream service.
export const linkRestaurantToOwner = async (userId, restaurantId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, restaurantId: true },
    });

    if (!user || user.role === "customer") {
        const err = new Error("User not found");
        err.statusCode = 404;
        err.code = "USER_NOT_FOUND";
        throw err;
    }

    if (user.restaurantId && user.restaurantId !== restaurantId) {
        const err = new Error("User is already linked to a different restaurant");
        err.statusCode = 409;
        err.code = "RESTAURANT_ALREADY_LINKED";
        throw err;
    }

    return prisma.user.update({
        where: { id: userId },
        data: { restaurantId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            restaurantId: true,
            createdAt: true,
        },
    });
};
