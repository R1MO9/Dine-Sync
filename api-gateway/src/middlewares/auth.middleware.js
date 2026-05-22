import jwt from "jsonwebtoken";
import config from "../config.js";
import { sendError } from "../utils/response.js";

/**
 * Verifies JWT from Authorization header.
 * Attaches decoded payload to req.user.
 * Skips verification for public routes (handled in proxy config).
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return sendError(res, 401, "UNAUTHORIZED", "Missing or malformed Authorization header");
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = decoded; // { userId, restaurantId, role, email }
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return sendError(res, 401, "TOKEN_EXPIRED", "Access token has expired");
        }
        return sendError(res, 401, "INVALID_TOKEN", "Invalid access token");
    }
};

/**
 * Role-based access guard.
 * Call after authenticate().
 * Pass an empty array to allow any authenticated user.
 *
 * Usage: authorize(['owner', 'floor_manager'])
 */
const authorize =
    (allowedRoles = []) =>
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

export { authenticate, authorize };
