import {
    inviteStaff,
    validateInviteToken,
    acceptInvite,
    getStaffByRestaurant,
    removeStaff,
    getPendingInvites,
    cancelInvite,
} from "../services/staff.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

// ── POST /api/v1/staff/invite ─────────────────────────────────────
export const invite = async (req, res, next) => {
    try {
        const result = await inviteStaff(req.user.userId, req.body);
        return sendSuccess(res, 201, result, "Invite sent successfully");
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/staff/accept-invite?token=xxx ─────────────────────
// Validates token and returns invite details (frontend uses this to pre-fill the form)
export const getInviteDetails = async (req, res, next) => {
    try {
        const { token } = req.query;
        if (!token) return sendError(res, 400, "MISSING_TOKEN", "Invite token is required");

        const details = await validateInviteToken(token);
        return sendSuccess(res, 200, details, "Invite is valid");
    } catch (err) {
        next(err);
    }
};

// ── POST /api/v1/staff/accept-invite ─────────────────────────────
// Staff submits name + password to complete registration
export const accept = async (req, res, next) => {
    try {
        const result = await acceptInvite(req.body);

        logger.info("Staff accepted invite", { userId: result.user.id });
        return sendSuccess(
            res,
            201,
            result,
            "Account created and linked to restaurant successfully"
        );
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/staff ─────────────────────────────────────────────
export const getAll = async (req, res, next) => {
    try {
        const staff = await getStaffByRestaurant(req.user.userId);
        return sendSuccess(res, 200, { staff });
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/v1/staff/:id ──────────────────────────────────────
export const remove = async (req, res, next) => {
    try {
        await removeStaff(req.params.id, req.user.userId);
        logger.info("Staff removed", { staffId: req.params.id });
        return sendSuccess(res, 200, null, "Staff member removed successfully");
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/staff/invites ─────────────────────────────────────
export const getInvites = async (req, res, next) => {
    try {
        const invites = await getPendingInvites(req.user.userId);
        return sendSuccess(res, 200, { invites });
    } catch (err) {
        next(err);
    }
};

// ── DELETE /api/v1/staff/invites/:id ─────────────────────────────
export const cancelInviteById = async (req, res, next) => {
    try {
        await cancelInvite(req.params.id, req.user.userId); // ← userId not restaurantId
        return sendSuccess(res, 200, null, "Invite cancelled successfully");
    } catch (err) {
        next(err);
    }
};
