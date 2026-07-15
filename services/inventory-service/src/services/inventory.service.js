import { prisma } from "../config/db.js";
import logger from "../utils/logger.js";

// ── Kafka handler ──────────────────────────────────────────────────

// Deduct stock on order.approved (not order.placed) so a cancelled-before-approval
// order never touches stock.
export const deductStockForOrder = async ({ restaurantId, items }) => {
    for (const item of items || []) {
        const stockItem = await prisma.stockItem.findUnique({
            where: { restaurantId_dishId: { restaurantId, dishId: item.dishId } },
        });
        if (!stockItem || !stockItem.isTracked) continue;

        const [updated] = await prisma.$transaction([
            prisma.stockItem.update({
                where: { id: stockItem.id },
                data: { quantity: { decrement: item.quantity } },
            }),
            prisma.stockLog.create({
                data: {
                    stockItemId: stockItem.id,
                    change: -item.quantity,
                    reason: "order_deduction",
                },
            }),
        ]);

        if (updated.quantity <= 0) {
            logger.warn("Stock depleted", { restaurantId, dishId: item.dishId, stockItemId: stockItem.id });
        }
    }
};

// ── REST-facing ────────────────────────────────────────────────────

export const createStockItem = async (restaurantId, { dishId, quantity, lowStockThreshold }) => {
    const existing = await prisma.stockItem.findUnique({
        where: { restaurantId_dishId: { restaurantId, dishId } },
    });
    if (existing) {
        const err = new Error("Stock item already exists for this dish");
        err.statusCode = 409;
        err.code = "STOCK_ITEM_EXISTS";
        throw err;
    }
    return prisma.stockItem.create({
        data: { restaurantId, dishId, quantity, lowStockThreshold },
    });
};

export const getStockItems = async (restaurantId) => {
    return prisma.stockItem.findMany({
        where: { restaurantId, isTracked: true },
        orderBy: { createdAt: "asc" },
    });
};

export const getStockItemById = async (id, restaurantId) => {
    const stockItem = await prisma.stockItem.findFirst({
        where: { id, restaurantId },
        include: { logs: { orderBy: { createdAt: "desc" }, take: 20 } },
    });
    if (!stockItem) {
        const err = new Error("Stock item not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return stockItem;
};

export const adjustStock = async (id, restaurantId, { change, reason, note }) => {
    const stockItem = await prisma.stockItem.findFirst({ where: { id, restaurantId } });
    if (!stockItem) {
        const err = new Error("Stock item not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    const [updated] = await prisma.$transaction([
        prisma.stockItem.update({
            where: { id },
            data: { quantity: { increment: change } },
        }),
        prisma.stockLog.create({
            data: { stockItemId: id, change, reason, note },
        }),
    ]);

    logger.info("Stock adjusted", { stockItemId: id, change, reason });
    return updated;
};

export const stopTrackingStockItem = async (id, restaurantId) => {
    const stockItem = await prisma.stockItem.findFirst({ where: { id, restaurantId } });
    if (!stockItem) {
        const err = new Error("Stock item not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return prisma.stockItem.update({ where: { id }, data: { isTracked: false } });
};
