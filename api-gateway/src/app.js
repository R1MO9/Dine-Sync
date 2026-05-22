import express from "express";
import helmet from "helmet";

import corsMiddleware from "./middlewares/cors.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import requestLogger from "./middlewares/requestLogger.js";
import errorHandler from "./middlewares/errorHandler.js";
import { resolveTenant } from "./middlewares/tenant.middleware.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { createProxy } from "./plugins/proxy.js";
import ROUTES from "./config/routes.config.js";
import { sendError } from "./utils/response.js";

const app = express();

// ── Security ──────────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet());
app.use(corsMiddleware);

// ── Parse JSON (for gateway-level endpoints only) ─────────────────
app.use(express.json());

// ── Global middleware ─────────────────────────────────────────────
app.use(resolveTenant); // resolve X-Restaurant-ID / subdomain first
app.use(rateLimiter); // rate limit before any work
app.use(requestLogger); // attach request ID + log

// ── Health check (no auth required) ──────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "api-gateway",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

// ── Dynamic proxy registration ────────────────────────────────────
ROUTES.forEach(({ path, target, auth, roles = [] }) => {
    const middlewares = [];

    // Conditionally apply JWT auth + role guard
    if (auth) {
        middlewares.push(authenticate);

        if (roles.length > 0) {
            middlewares.push((req, res, next) => {
                if (!roles.includes(req.user?.role)) {
                    return sendError(
                        res,
                        403,
                        "FORBIDDEN",
                        `Role '${req.user?.role}' cannot access this resource`
                    );
                }
                next();
            });
        }
    }

    // Register proxy for this route
    middlewares.push(createProxy(target));
    app.use(path, ...middlewares);
});

// ── 404 handler ───────────────────────────────────────────────────
app.use((req, res) => {
    sendError(res, 404, "ROUTE_NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`);
});

// ── Global error handler (must be last) ───────────────────────────
app.use(errorHandler);

export default app;
