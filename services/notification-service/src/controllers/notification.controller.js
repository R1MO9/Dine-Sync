import { getNotifications, markAsRead } from "../services/notification.service.js";
import { sendSuccess } from "../utils/response.js";

// ── GET /api/v1/notifications ─────────────────────────────────────
export const getAll = async (req, res, next) => {
    try {
        const notifications = await getNotifications(req.user.restaurantId);
        return sendSuccess(res, 200, { notifications });
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/v1/notifications/:id/read ──────────────────────────
export const read = async (req, res, next) => {
    try {
        const notification = await markAsRead(req.params.id, req.user.restaurantId);
        return sendSuccess(res, 200, { notification }, "Notification marked as read");
    } catch (err) {
        next(err);
    }
};
