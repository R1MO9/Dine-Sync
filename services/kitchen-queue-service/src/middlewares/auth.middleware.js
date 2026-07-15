import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { sendError } from "../utils/response.js";

/**
 * Reads JWT from cookie or Authorization header.
 * Attaches decoded payload to req.user.
 * Token is issued by auth-service and forwarded via API gateway headers.
 */
export const authenticate = (req, res, next) => {
    // API gateway forwards these headers after verifying the token
    const userId = req.headers["x-user-id"];
    const userRole = req.headers["x-user-role"];
    const restaurantId = req.headers["x-restaurant-id"];

    // If coming through API gateway — trust the forwarded headers
    if (userId && userRole) {
        req.user = { userId, role: userRole, restaurantId };
        return next();
    }

    // Direct call (dev/testing) — verify JWT manually
    let token = req.cookies?.accessToken;
    if (!token) {
        const authHeader = req.headers["authorization"];
        if (authHeader?.startsWith("Bearer ")) token = authHeader.split(" ")[1];
    }

    if (!token) {
        return sendError(res, 401, "UNAUTHORIZED", "Missing access token");
    }

    try {
        const decoded = jwt.verify(token, config.jwt.accessSecret);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return sendError(res, 401, "TOKEN_EXPIRED", "Access token has expired");
        }
        return sendError(res, 401, "INVALID_TOKEN", "Invalid access token");
    }
};

export const authorize =
    (...allowedRoles) =>
    (req, res, next) => {
        if (!req.user) {
            return sendError(res, 401, "UNAUTHORIZED", "Not authenticated");
        }
        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return sendError(res, 403, "FORBIDDEN", `Role '${req.user.role}' is not allowed`);
        }
        next();
    };
