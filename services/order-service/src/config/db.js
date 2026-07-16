import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger.js";

const globalForPrisma = globalThis;

const basePrisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
        ],
    });

basePrisma.$on("query", (e) => {
    if (process.env.NODE_ENV === "development") {
        logger.debug("Prisma query", { query: e.query, duration: `${e.duration}ms` });
    }
});

basePrisma.$on("error", (e) => logger.error("Prisma error", { message: e.message }));
basePrisma.$on("warn", (e) => logger.warn("Prisma warning", { message: e.message }));

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;

basePrisma
    .$connect()
    .then(() => logger.info("Database connected"))
    .catch((err) => {
        logger.error("Database connection failed", { message: err.message });
        process.exit(1);
    });

// Prisma serializes `Decimal` fields to strings over JSON — without this,
// totalAmount/dishPrice/itemTotal arrive at consumers (staff dashboard revenue
// sums, order-service's own arithmetic) as strings instead of numbers.
export const prisma = basePrisma.$extends({
    result: {
        order: {
            totalAmount: {
                needs: { totalAmount: true },
                compute: (order) => Number(order.totalAmount),
            },
        },
        orderItem: {
            dishPrice: {
                needs: { dishPrice: true },
                compute: (item) => Number(item.dishPrice),
            },
            itemTotal: {
                needs: { itemTotal: true },
                compute: (item) => Number(item.itemTotal),
            },
        },
    },
});
