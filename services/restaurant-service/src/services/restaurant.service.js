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

export const linkOwnerRestaurantInAuth = async (ownerId, restaurantId) => {
    const response = await fetch(
        `${config.services.auth}/api/v1/auth/internal/user/${ownerId}/restaurant`,
        {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Api-Key": config.internalApiKey,
            },
            body: JSON.stringify({ restaurantId }),
        }
    );

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
        const err = new Error(data?.message || "Failed to link restaurant to owner");
        err.statusCode = response.status || 502;
        err.code = data?.code || "AUTH_SYNC_FAILED";
        throw err;
    }
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
    const restaurant = await prisma.restaurant.create({
        data: { name, subdomain, address, phone, ownerId },
    });

    try {
        await linkOwnerRestaurantInAuth(ownerId, restaurant.id);
    } catch (err) {
        await prisma.restaurant.delete({ where: { id: restaurant.id } }).catch(() => null);
        throw err;
    }

    return restaurant;
};

export const getRestaurantByOwnerService = async (ownerId) => {
    return prisma.restaurant.findFirst({
        where: { ownerId, isActive: true },
        include: { tables: true, staff: true },
    });
};

export const getRestaurantById = async (id, requester) => {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) {
        const err = new Error("Restaurant not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    const isInsider =
        restaurant.ownerId === requester?.userId || requester?.restaurantId === restaurant.id;

    if (!isInsider) {
        // Outsiders (any other authenticated user) only get public-safe fields —
        // no staff list or table QR tokens.
        const { id, name, subdomain, address, phone, logoUrl, plan } = restaurant;
        return { id, name, subdomain, address, phone, logoUrl, plan };
    }

    const [tables, staff] = await Promise.all([
        prisma.table.findMany({ where: { restaurantId: id } }),
        prisma.staff.findMany({ where: { restaurantId: id } }),
    ]);
    return { ...restaurant, tables, staff };
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

// Internal — used by order-service to validate a table before placing an order.
// Returns only the minimal, non-sensitive fields a downstream service needs.
export const getTableInternal = async (tableId) => {
    const table = await prisma.table.findUnique({
        where: { id: tableId },
        select: { id: true, restaurantId: true, number: true, isActive: true },
    });
    if (!table) {
        const err = new Error("Table not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return table;
};

export const getTablesByRestaurant = async (ownerId) => {
    const restaurant = await getRestaurantByOwner(ownerId);
    return prisma.table.findMany({
        where: { restaurantId: restaurant.id, isActive: true },
        orderBy: { number: "asc" },
    });
};

// Public — resolves a scanned QR code to the restaurant/table it belongs to.
// qrToken is an opaque one-way hash (see utils/qrcode.js), so this is the only
// way a client can turn a scan into a restaurantId/tableId to load the menu.
export const getTableByQrToken = async (qrToken) => {
    const table = await prisma.table.findUnique({
        where: { qrToken },
        select: {
            id: true,
            restaurantId: true,
            number: true,
            isActive: true,
            restaurant: { select: { name: true, logoUrl: true, isActive: true } },
        },
    });

    if (!table || !table.isActive || !table.restaurant.isActive) {
        const err = new Error("This QR code is no longer valid");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    return {
        tableId: table.id,
        restaurantId: table.restaurantId,
        tableNumber: table.number,
        restaurantName: table.restaurant.name,
        restaurantLogoUrl: table.restaurant.logoUrl,
    };
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

// Staff management (invite/accept/list/remove) lives in staff.service.js.
