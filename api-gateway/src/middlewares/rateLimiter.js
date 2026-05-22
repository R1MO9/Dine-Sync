import redis from "../utils/redis.js";
import config from "../config.js";
import { sendError } from "../utils/response.js";

/**
 * Redis-backed sliding window rate limiter.
 *
 * Key strategy:
 *   - Per IP (global):  ratelimit:ip:<ip>
 *   - Per tenant:       ratelimit:tenant:<restaurantId>
 *
 * Returns 429 with Retry-After header when limit is exceeded.
 */
const rateLimiter = async (req, res, next) => {
    const { windowMs, maxGlobal, maxPerTenant } = config.rateLimit;
    const windowSec = Math.floor(windowMs / 1000);

    try {
        const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
        const ipKey = `ratelimit:ip:${ip}`;

        // ── Global IP limit ──────────────────────────────────────────
        const ipCount = await redis.incr(ipKey);
        if (ipCount === 1) await redis.expire(ipKey, windowSec);

        if (ipCount > maxGlobal) {
            const ttl = await redis.ttl(ipKey);
            res.set("Retry-After", ttl);
            return sendError(
                res,
                429,
                "RATE_LIMIT_EXCEEDED",
                "Too many requests — please slow down"
            );
        }

        // ── Per-tenant limit (if tenant is resolved) ─────────────────
        const tenantId = req.tenantId || req.tenantSubdomain;
        if (tenantId) {
            const tenantKey = `ratelimit:tenant:${tenantId}`;
            const tenantCount = await redis.incr(tenantKey);
            if (tenantCount === 1) await redis.expire(tenantKey, windowSec);

            if (tenantCount > maxPerTenant) {
                const ttl = await redis.ttl(tenantKey);
                res.set("Retry-After", ttl);
                return sendError(
                    res,
                    429,
                    "TENANT_RATE_LIMIT_EXCEEDED",
                    "Restaurant API rate limit exceeded"
                );
            }
        }

        next();
    } catch (err) {
        // Fail open — don't block traffic if Redis is down
        console.error("[RateLimiter] Redis error, failing open:", err.message);
        next();
    }
};

export default rateLimiter;
