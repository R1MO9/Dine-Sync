import logger from "../utils/logger.js";
import { sendError } from "../utils/response.js";

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    logger.error("Unhandled error", {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
    });

    // Prisma known errors
    if (err.code === "P2002") {
        return sendError(res, 409, "DUPLICATE_ENTRY", "A record with this value already exists");
    }
    if (err.code === "P2025") {
        return sendError(res, 404, "NOT_FOUND", "Record not found");
    }

    // JWT errors (shouldn't reach here but just in case)
    if (err.name === "JsonWebTokenError") {
        return sendError(res, 401, "INVALID_TOKEN", "Invalid token");
    }
    if (err.name === "TokenExpiredError") {
        return sendError(res, 401, "TOKEN_EXPIRED", "Token has expired");
    }

    return sendError(
        res,
        err.statusCode || 500,
        err.code || "INTERNAL_ERROR",
        err.message || "An unexpected error occurred"
    );
};

export default errorHandler;
