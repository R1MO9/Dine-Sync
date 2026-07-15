import config from "../config/index.js";
import { sendError } from "../utils/response.js";

/**
 * Guards service-to-service routes. Callers must present the shared
 * INTERNAL_API_KEY via the X-Internal-Api-Key header — these routes are
 * never meant to be reachable by end users, even when a service is hit
 * directly on its own port.
 */
export const internalAuth = (req, res, next) => {
    const key = req.headers["x-internal-api-key"];

    if (!key || key !== config.internalApiKey) {
        return sendError(res, 401, "UNAUTHORIZED", "Missing or invalid internal API key");
    }

    next();
};
