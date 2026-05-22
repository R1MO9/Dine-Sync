import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { sendError } from "../utils/response.js";

/**
 * Verifies JWT access token from Authorization header.
 * Attaches decoded payload to req.user.
 */
export const authenticate = (req, res, next) => {
    // 1. Try cookie first
    let token = req.cookies?.accessToken;

    // 2. Fall back to Authorization header
    if (!token) {
        const authHeader = req.headers["authorization"];
        if (authHeader?.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
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

/**
 * Role-based access guard — use after authenticate().
 * Pass allowed roles as arguments.
 *
 * Usage: authorize('owner', 'floor_manager')
 */
export const authorize =
    (...allowedRoles) =>
    (req, res, next) => {
        if (!req.user) {
            return sendError(res, 401, "UNAUTHORIZED", "Not authenticated");
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return sendError(
                res,
                403,
                "FORBIDDEN",
                `Role '${req.user.role}' is not allowed to access this resource`
            );
        }

        next();
    };
