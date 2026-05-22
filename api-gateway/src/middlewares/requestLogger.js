import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";

/**
 * Assigns a unique X-Request-ID to every request and logs:
 *   → incoming request (method, url, tenant, user)
 *   ← outgoing response (status, duration)
 */
const requestLogger = (req, res, next) => {
    const requestId = req.headers["x-request-id"] || uuidv4();
    req.requestId = requestId;

    // Forward request ID downstream so all services can trace the same request
    req.headers["x-request-id"] = requestId;
    res.set("X-Request-ID", requestId);

    const startTime = Date.now();

    logger.info("Incoming request", {
        requestId,
        method: req.method,
        url: req.originalUrl,
        tenant: req.tenantId || req.tenantSubdomain || "none",
        userId: req.user?.userId || "anonymous",
        ip: req.ip,
    });

    res.on("finish", () => {
        const duration = Date.now() - startTime;
        const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

        logger[level]("Request completed", {
            requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
        });
    });

    next();
};

export default requestLogger;
