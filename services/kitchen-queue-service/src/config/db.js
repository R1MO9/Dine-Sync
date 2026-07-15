import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";

const globalForPrisma = globalThis;

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
        ],
    });

prisma.$on("query", (e) => {
    if (process.env.NODE_ENV === "development") {
        logger.debug("Prisma query", { query: e.query, duration: `${e.duration}ms` });
    }
});

prisma.$on("error", (e) => logger.error("Prisma error", { message: e.message }));
prisma.$on("warn", (e) => logger.warn("Prisma warning", { message: e.message }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

prisma
    .$connect()
    .then(() => logger.info("Database connected"))
    .catch((err) => {
        logger.error("Database connection failed", { message: err.message });
        process.exit(1);
    });
