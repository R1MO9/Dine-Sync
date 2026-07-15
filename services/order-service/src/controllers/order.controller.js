import {
    placeOrder,
    getOrdersByRestaurant,
    getLiveOrders,
    getOrderById,
    updateOrderStatus,
    getOrdersByTable,
} from "../services/order.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

// ── POST /api/v1/orders ───────────────────────────────────────────
// Public — customer places order from QR scan (no auth required)
export const place = async (req, res, next) => {
    try {
        const customerId = req.user?.userId || null; // optional — if customer is logged in
        const order = await placeOrder(req.body, customerId);
        logger.info("Order placed via API", { orderId: order.id });
        return sendSuccess(res, 201, { order }, "Order placed successfully");
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/orders/live ───────────────────────────────────────
// Floor manager — all active orders in real time
export const live = async (req, res, next) => {
    try {
        const orders = await getLiveOrders(req.user.restaurantId);
        return sendSuccess(res, 200, { orders });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/orders ────────────────────────────────────────────
// Owner/manager — all orders with filters
export const getAll = async (req, res, next) => {
    try {
        const { status, tableId, date } = req.query;
        const orders = await getOrdersByRestaurant(req.user.restaurantId, {
            status,
            tableId,
            date,
        });
        return sendSuccess(res, 200, { orders });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/orders/table/:tableId ────────────────────────────
// Get all orders for a specific table (customer can poll this)
export const getByTable = async (req, res, next) => {
    try {
        const restaurantId = req.user?.restaurantId || req.query.restaurantId;
        const orders = await getOrdersByTable(restaurantId, req.params.tableId);
        return sendSuccess(res, 200, { orders });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/orders/:id ────────────────────────────────────────
export const getById = async (req, res, next) => {
    try {
        const order = await getOrderById(req.params.id, req.user.restaurantId);
        return sendSuccess(res, 200, { order });
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/v1/orders/:id/status ──────────────────────────────
// Floor manager approves/serves, chef updates in_progress/ready
export const updateStatus = async (req, res, next) => {
    try {
        const order = await updateOrderStatus(
            req.params.id,
            req.user.restaurantId,
            req.body,
            req.user.userId,
            req.user.role
        );
        logger.info("Order status updated via API", {
            orderId: req.params.id,
            status: req.body.status,
        });
        return sendSuccess(res, 200, { order }, `Order status updated to '${req.body.status}'`);
    } catch (err) {
        next(err);
    }
};
