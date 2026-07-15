import {
    createStockItem,
    getStockItems,
    getStockItemById,
    adjustStock,
    stopTrackingStockItem,
} from "../services/inventory.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

// ── POST /api/v1/inventory ─────────────────────────────────────────
export const create = async (req, res, next) => {
    try {
        const stockItem = await createStockItem(req.user.restaurantId, req.body);
        logger.info("Stock item created", { stockItemId: stockItem.id });
        return sendSuccess(res, 201, { stockItem }, "Stock item created successfully");
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/inventory ──────────────────────────────────────────
export const getAll = async (req, res, next) => {
    try {
        const stockItems = await getStockItems(req.user.restaurantId);
        return sendSuccess(res, 200, { stockItems });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/inventory/:id ──────────────────────────────────────
export const getById = async (req, res, next) => {
    try {
        const stockItem = await getStockItemById(req.params.id, req.user.restaurantId);
        return sendSuccess(res, 200, { stockItem });
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/v1/inventory/:id/adjust ─────────────────────────────
export const adjust = async (req, res, next) => {
    try {
        const stockItem = await adjustStock(req.params.id, req.user.restaurantId, req.body);
        logger.info("Stock item adjusted via API", { stockItemId: req.params.id });
        return sendSuccess(res, 200, { stockItem }, "Stock adjusted successfully");
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/v1/inventory/:id ───────────────────────────────────
export const remove = async (req, res, next) => {
    try {
        await stopTrackingStockItem(req.params.id, req.user.restaurantId);
        logger.info("Stock item untracked", { stockItemId: req.params.id });
        return sendSuccess(res, 200, null, "Stock item is no longer tracked");
    } catch (err) {
        next(err);
    }
};
