import app from "./src/app.js";
import config from "./src/config/index.js";
import logger from "./src/utils/logger.js";
import { prisma } from "./src/config/db.js";
import { connectProducer, disconnectProducer } from "./src/kafka/producer.js";

const start = async () => {
    await connectProducer();

    const server = app.listen(config.port, () => {
        logger.info("Payment service running", {
            port: config.port,
            env: config.env,
            provider: config.payment.provider,
        });
    });

    const shutdown = async (signal) => {
        logger.info(`${signal} received — shutting down gracefully`);
        server.close(async () => {
            await disconnectProducer();
            await prisma.$disconnect();
            logger.info("Shutdown complete");
            process.exit(0);
        });
        setTimeout(() => {
            logger.error("Forced shutdown");
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
};

start();
