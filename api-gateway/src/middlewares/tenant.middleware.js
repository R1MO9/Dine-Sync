import { sendError } from "../utils/response.js";

/**
 * Resolves the restaurant tenant from the incoming request.
 *
 * Resolution order:
 *   1. X-Restaurant-ID header (for direct API / Postman calls)
 *   2. Subdomain — e.g. pizza-hut.dinesync.com → restaurantId lookup
 *
 * Attaches req.tenantId for downstream forwarding.
 */
const resolveTenant = (req, res, next) => {
    // 1. Explicit header (Postman, internal service calls)
    const headerTenantId = req.headers["x-restaurant-id"];
    if (headerTenantId) {
        req.tenantId = headerTenantId;
        req.headers["x-tenant-id"] = headerTenantId; // forward to downstream
        return next();
    }

    // 2. Subdomain extraction
    const host = req.headers["host"] || "";
    const parts = host.split(".");

    // Expects: <subdomain>.dinesync.com (3 parts minimum)
    // Skip for localhost / direct IP access
    if (parts.length >= 3) {
        const subdomain = parts[0];

        if (subdomain && subdomain !== "www" && subdomain !== "api") {
            // In production, resolve subdomain → restaurantId via a fast Redis lookup
            // For now, forward subdomain as-is; restaurant-service validates it
            req.tenantSubdomain = subdomain;
            req.headers["x-tenant-subdomain"] = subdomain;
            return next();
        }
    }

    // Public routes (QR scan, auth) don't need a tenant — pass through
    next();
};

/**
 * Strict tenant guard — use on routes that REQUIRE a tenant context.
 * Apply after resolveTenant().
 */
const requireTenant = (req, res, next) => {
    if (!req.tenantId && !req.tenantSubdomain) {
        return sendError(
            res,
            400,
            "TENANT_MISSING",
            "Could not resolve restaurant tenant from request"
        );
    }
    next();
};

export { resolveTenant, requireTenant };
