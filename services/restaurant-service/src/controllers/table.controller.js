import {
    createTable,
    getTablesByRestaurant,
    deleteTable,
    getTableByQrToken,
} from "../services/restaurant.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

export const create = async (req, res, next) => {
    try {
        const table = await createTable(req.user.userId, req.body); // ← userId
        logger.info("Table created", { tableId: table.id });
        return sendSuccess(res, 201, { table }, "Table created successfully");
    } catch (err) {
        next(err);
    }
};

export const getAll = async (req, res, next) => {
    try {
        const tables = await getTablesByRestaurant(req.user.userId); // ← userId
        return sendSuccess(res, 200, { tables });
    } catch (err) {
        next(err);
    }
};

export const remove = async (req, res, next) => {
    try {
        await deleteTable(req.params.id, req.user.userId); // ← userId
        logger.info("Table removed", { tableId: req.params.id });
        return sendSuccess(res, 200, null, "Table removed successfully");
    } catch (err) {
        next(err);
    }
};

// GET /api/v1/tables/qr/:qrToken — public, hit right after a customer scans the QR code
export const resolveQrToken = async (req, res, next) => {
    try {
        const table = await getTableByQrToken(req.params.qrToken);
        return sendSuccess(res, 200, { table });
    } catch (err) {
        next(err);
    }
};
