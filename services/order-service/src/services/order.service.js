import { prisma } from "../config/db.js";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { publishEvent } from "../kafka/producer.js";
import { TOPICS } from "../kafka/topics.js";

// ── Helper: fetch table details from restaurant-service ──────────────────
const fetchTable = async (tableId, restaurantId) => {
    const res = await fetch(`${config.services.restaurant}/api/v1/${restaurantId}/tables/${tableId}`);
    const data = await res.json();
    if (!res.ok) {
        const err = new Error("Table not found");
        err.statusCode = 404;
        err.code = "TABLE_NOT_FOUND";
        throw err;
    }
    return data.data.table;
};

// ── Helper: fetch dish details from menu-service ──────────────────
const fetchDish = async (dishId, restaurantId) => {
    const res = await fetch(
        `${config.services.menu}/api/v1/menu/public/${restaurantId}/dishes/${dishId}`
    );
    const data = await res.json();
    if (!res.ok) {
        const err = new Error(data.message || "Dish not found");
        err.statusCode = 404;
        err.code = "DISH_NOT_FOUND";
        throw err;
    }
    return data.data.dish;
};

// ── Place Order ───────────────────────────────────────────────────
export const placeOrder = async (
    { restaurantId, tableId, items, notes },
    customerId = null
) => {
    // Fetch table details from restaurant-service and validate
    const table = await fetchTable(tableId, restaurantId);
    if (table.restaurantId !== restaurantId) {
        const err = new Error("Table does not belong to this restaurant");
        err.statusCode = 403;
        err.code = "INVALID_TABLE";
        throw err;
    }
    // Fetch dish details from menu-service and validate
    const enrichedItems = await Promise.all(
        items.map(async (item) => {
            const dish = await fetchDish(item.dishId, restaurantId);

            const customizationTotal = (item.customizations || []).reduce(
                (sum, c) => sum + c.extraPrice,
                0
            );
            const addOnTotal = (item.addOns || []).reduce((sum, a) => sum + a.price, 0);
            const itemTotal = (dish.price + customizationTotal + addOnTotal) * item.quantity;

            return {
                dishId: dish.id,
                dishName: dish.name,
                dishPrice: dish.price,
                quantity: item.quantity,
                customizations: item.customizations || [],
                addOns: item.addOns || [],
                itemTotal,
                notes: item.notes,
            };
        })
    );

    const totalAmount = enrichedItems.reduce((sum, i) => sum + i.itemTotal, 0);

    // Create order + items in a transaction
    const order = await prisma.order.create({
        data: {
            restaurantId,
            tableId,
            tableNumber: table.number,
            customerId,
            notes,
            totalAmount,
            items: { create: enrichedItems },
            statusLogs: { create: [{ status: "placed", note: "Order placed by customer" }] },
        },
        include: { items: true, statusLogs: true },
    });

    // Publish Kafka event
    await publishEvent(
        TOPICS.ORDER_PLACED,
        {
            orderId: order.id,
            restaurantId,
            tableId,
            tableNumber,
            totalAmount,
            itemCount: order.items.length,
        },
        restaurantId
    );

    logger.info("Order placed", { orderId: order.id, restaurantId, tableNumber });
    return order;
};

// ── Get Orders (manager view) ─────────────────────────────────────
export const getOrdersByRestaurant = async (restaurantId, filters = {}) => {
    const { status, tableId, date } = filters;

    const where = {
        restaurantId,
        ...(status ? { status } : {}),
        ...(tableId ? { tableId } : {}),
        ...(date
            ? {
                  createdAt: {
                      gte: new Date(date),
                      lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)),
                  },
              }
            : {}),
    };

    return prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { items: true, statusLogs: { orderBy: { createdAt: "asc" } } },
    });
};

// ── Get Live Orders ───────────────────────────────────────────────
export const getLiveOrders = async (restaurantId) => {
    return prisma.order.findMany({
        where: { restaurantId, status: { in: ["placed", "approved", "in_progress", "ready"] } },
        orderBy: { createdAt: "asc" },
        include: { items: true },
    });
};

// ── Get Single Order ──────────────────────────────────────────────
export const getOrderById = async (orderId, restaurantId) => {
    const order = await prisma.order.findFirst({
        where: { id: orderId, restaurantId },
        include: { items: true, statusLogs: { orderBy: { createdAt: "asc" } } },
    });
    if (!order) {
        const err = new Error("Order not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return order;
};

// ── Update Order Status ───────────────────────────────────────────
export const updateOrderStatus = async (
    orderId,
    restaurantId,
    { status, note },
    changedBy,
    role
) => {
    const order = await prisma.order.findFirst({ where: { id: orderId, restaurantId } });
    if (!order) {
        const err = new Error("Order not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    // Validate status transition
    const validTransitions = {
        placed: ["approved", "cancelled"],
        approved: ["in_progress", "cancelled"],
        in_progress: ["ready"],
        ready: ["served"],
        served: [],
        cancelled: [],
    };

    if (!validTransitions[order.status]?.includes(status)) {
        const err = new Error(`Cannot transition order from '${order.status}' to '${status}'`);
        err.statusCode = 400;
        err.code = "INVALID_STATUS_TRANSITION";
        throw err;
    }

    const updated = await prisma.order.update({
        where: { id: orderId },
        data: {
            status,
            statusLogs: { create: [{ status, changedBy, role, note }] },
        },
        include: { items: true, statusLogs: { orderBy: { createdAt: "asc" } } },
    });

    // Publish Kafka events based on new status
    if (status === "approved") {
        await publishEvent(
            TOPICS.ORDER_APPROVED,
            {
                orderId,
                restaurantId,
                tableId: order.tableId,
                tableNumber: order.tableNumber,
                items: updated.items,
                approvedBy: changedBy,
            },
            restaurantId
        );
    }

    if (status === "served") {
        await publishEvent(
            TOPICS.ORDER_COMPLETED,
            {
                orderId,
                restaurantId,
                totalAmount: order.totalAmount,
                items: updated.items,
            },
            restaurantId
        );
    }

    await publishEvent(
        TOPICS.ORDER_STATUS_UPDATED,
        {
            orderId,
            restaurantId,
            status,
            tableNumber: order.tableNumber,
            changedBy,
            role,
        },
        restaurantId
    );

    logger.info("Order status updated", { orderId, status, changedBy });
    return updated;
};

// ── Get Orders by Table ───────────────────────────────────────────
export const getOrdersByTable = async (restaurantId, tableId) => {
    return prisma.order.findMany({
        where: { restaurantId, tableId, status: { not: "cancelled" } },
        orderBy: { createdAt: "desc" },
        include: { items: true },
    });
};

// ── Kafka: Handle payment confirmed ──────────────────────────────
export const handlePaymentConfirmed = async ({ orderId, restaurantId }) => {
    await prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: "paid" },
    });
    logger.info("Order payment confirmed", { orderId, restaurantId });
};
