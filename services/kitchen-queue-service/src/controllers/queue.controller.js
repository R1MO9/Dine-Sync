import { getLiveTickets, getTicketById, updateTicketStatus } from "../services/queue.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

// ── GET /api/v1/queue ──────────────────────────────────────────────
export const live = async (req, res, next) => {
    try {
        const tickets = await getLiveTickets(req.user.restaurantId);
        return sendSuccess(res, 200, { tickets });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/queue/:id ──────────────────────────────────────────
export const getById = async (req, res, next) => {
    try {
        const ticket = await getTicketById(req.params.id, req.user.restaurantId);
        return sendSuccess(res, 200, { ticket });
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/v1/queue/:id/status ─────────────────────────────────
export const updateStatus = async (req, res, next) => {
    try {
        const ticket = await updateTicketStatus(req.params.id, req.user.restaurantId, req.body);
        logger.info("Queue ticket status updated via API", {
            ticketId: req.params.id,
            status: req.body.status,
        });
        return sendSuccess(res, 200, { ticket }, `Ticket status updated to '${req.body.status}'`);
    } catch (err) {
        next(err);
    }
};
