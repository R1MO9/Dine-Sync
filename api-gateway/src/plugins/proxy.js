import { createProxyMiddleware } from "http-proxy-middleware";
import logger from "../utils/logger.js";

/**
 * Creates a configured proxy middleware for a given target service.
 *
 * @param {string} target  - downstream service base URL
 * @param {object} options - optional overrides
 */
const createProxy = (target, options = {}) => {
    return createProxyMiddleware({
        target,
        changeOrigin: true,

        // Forward user context to downstream services via headers
        on: {
            proxyReq: (proxyReq, req) => {
                if (req.user) {
                    proxyReq.setHeader("X-User-ID", req.user.userId || "");
                    proxyReq.setHeader("X-User-Role", req.user.role || "");
                    proxyReq.setHeader(
                        "X-Restaurant-ID",
                        req.user.restaurantId || req.tenantId || ""
                    );
                }

                if (req.tenantSubdomain) {
                    proxyReq.setHeader("X-Tenant-Subdomain", req.tenantSubdomain);
                }

                if (req.requestId) {
                    proxyReq.setHeader("X-Request-ID", req.requestId);
                }

                logger.debug(`Proxying → ${target}${req.path}`, {
                    method: req.method,
                    requestId: req.requestId,
                });
            },

            error: (err, req, res) => {
                logger.error("Proxy error", {
                    target,
                    requestId: req.requestId,
                    message: err.message,
                    code: err.code,
                });

                if (!res.headersSent) {
                    const status = err.code === "ETIMEDOUT" ? 504 : 502;
                    const code = err.code === "ETIMEDOUT" ? "GATEWAY_TIMEOUT" : "BAD_GATEWAY";
                    res.status(status).json({ success: false, code, message: err.message });
                }
            },
        },

        // Timeouts
        proxyTimeout: parseInt(process.env.PROXY_TIMEOUT_MS || "10000"),
        timeout: parseInt(process.env.PROXY_TIMEOUT_MS || "10000"),

        ...options,
    });
};

export { createProxy };
