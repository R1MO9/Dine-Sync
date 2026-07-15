import app, { wsProxies } from "./src/app.js";
import config from "./src/config.js";
import logger from "./src/utils/logger.js";

const server = app.listen(config.port, () => {
    logger.info(`API Gateway running`, {
        port: config.port,
        env: config.env,
    });
});

// http-proxy-middleware needs the raw http.Server's 'upgrade' event wired
// per WS-enabled route (e.g. Socket.IO for /api/v1/notifications) — a plain
// app.use() doesn't intercept protocol upgrades on its own.
wsProxies.forEach((proxy) => server.on("upgrade", proxy.upgrade));

// ── Graceful shutdown ─────────────────────────────────────────────
const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
    }, 10000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { message: err.message, stack: err.stack });
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
    process.exit(1);
});
