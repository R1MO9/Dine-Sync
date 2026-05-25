import { prisma } from "../config/db.js";
import config from "../config/index.js";
import { generateQrToken } from "../utils/qrcode.js";

// ── Helper ────────────────────────────────────────────────────────
export const getRestaurantByOwner = async (ownerId) => {
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

// ── Restaurant ────────────────────────────────────────────────────
export const createRestaurant = async ({ name, subdomain, address, phone }, ownerId) => {
    const existing = await prisma.restaurant.findUnique({ where: { subdomain } });
    if (existing) {
        const err = new Error("Subdomain is already taken");
        err.statusCode = 409;
        err.code = "SUBDOMAIN_TAKEN";
        throw err;
    }
    return prisma.restaurant.create({
        data: { name, subdomain, address, phone, ownerId },
    });
};

export const getRestaurantByOwnerService = async (ownerId) => {
    return prisma.restaurant.findFirst({
        where: { ownerId, isActive: true },
        include: { tables: true, staff: true },
    });
};

export const getRestaurantById = async (id) => {
    const restaurant = await prisma.restaurant.findUnique({
        where: { id },
        include: { tables: true, staff: true },
    });
    if (!restaurant) {
        const err = new Error("Restaurant not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return restaurant;
};

export const updateRestaurant = async (id, ownerId, data) => {
    const restaurant = await prisma.restaurant.findFirst({ where: { id, ownerId } });
    if (!restaurant) {
        const err = new Error("Restaurant not found or access denied");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return prisma.restaurant.update({ where: { id }, data });
};

// ── Tables ────────────────────────────────────────────────────────

export const createTable = async (ownerId, { number, label }) => {
    const restaurant = await getRestaurantByOwner(ownerId);

    const existing = await prisma.table.findUnique({
        where: { restaurantId_number: { restaurantId: restaurant.id, number } },
    });
    if (existing) {
        const err = new Error(`Table number ${number} already exists`);
        err.statusCode = 409;
        err.code = "TABLE_EXISTS";
        throw err;
    }

    const qrToken = generateQrToken(restaurant.id, number);
    return prisma.table.create({
        data: { restaurantId: restaurant.id, number, label, qrToken },
    });
};

export const getTablesByRestaurant = async (ownerId) => {
    const restaurant = await getRestaurantByOwner(ownerId);
    return prisma.table.findMany({
        where: { restaurantId: restaurant.id, isActive: true },
        orderBy: { number: "asc" },
    });
};

export const deleteTable = async (tableId, ownerId) => {
    const restaurant = await getRestaurantByOwner(ownerId);

    const table = await prisma.table.findFirst({
        where: { id: tableId, restaurantId: restaurant.id },
    });
    if (!table) {
        const err = new Error("Table not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return prisma.table.update({ where: { id: tableId }, data: { isActive: false } });
};

// ── Staff ─────────────────────────────────────────────────────────

export const addStaff = async (restaurantId, { userId, role }) => {
    const existing = await prisma.staff.findUnique({
        where: { restaurantId_userId: { restaurantId, userId } },
    });

    if (existing) {
        const err = new Error("User is already a staff member");
        err.statusCode = 409;
        err.code = "STAFF_EXISTS";
        throw err;
    }

    return prisma.staff.create({ data: { restaurantId, userId, role } });
};

export const getStaffByRestaurant = async (ownerId) => {
    const restaurant = await getRestaurantByOwner(ownerId);

    const staffList = await prisma.staff.findMany({
        where: { restaurantId: restaurant.id, isActive: true },
        orderBy: { createdAt: "asc" },
        select: { id: true, userId: true, role: true, createdAt: true },
    });

    // Fetch user details from auth-service for each staff member
    const staffWithUsers = await Promise.all(
        staffList.map(async (staff) => {
            try {
                const res = await fetch(
                    `${config.services.auth}/api/v1/auth/internal/user/${staff.userId}`
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

export const removeStaff = async (staffId, restaurantId) => {
    const staff = await prisma.staff.findFirst({ where: { id: staffId, restaurantId } });

    if (!staff) {
        const err = new Error("Staff member not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    return prisma.staff.update({ where: { id: staffId }, data: { isActive: false } });
};
