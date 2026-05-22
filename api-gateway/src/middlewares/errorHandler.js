import logger from "../utils/logger.js";
import { sendError } from "../utils/response.js";

/**
 * Global error handler — must be registered LAST in Express middleware chain.
 * Catches errors thrown by proxy, middleware, or unmatched routes.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    logger.error("Unhandled gateway error", {
        requestId: req.requestId,
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
    });

    // CORS errors
    if (err.message && err.message.startsWith("CORS")) {
        return sendError(res, 403, "CORS_ERROR", err.message);
    }

    // Proxy / upstream errors
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
        return sendError(res, 502, "SERVICE_UNAVAILABLE", "Upstream service is unreachable");
    }

    if (err.code === "ETIMEDOUT") {
        return sendError(res, 504, "GATEWAY_TIMEOUT", "Upstream service timed out");
    }

    return sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred");
};

export default errorHandler;
