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
// every price field arrives at consumers (frontend arithmetic, order-service's
// Zod schemas) as a string instead of a number.
export const prisma = basePrisma.$extends({
    result: {
        dish: {
            price: {
                needs: { price: true },
                compute: (dish) => Number(dish.price),
            },
        },
        customizationOption: {
            extraPrice: {
                needs: { extraPrice: true },
                compute: (option) => Number(option.extraPrice),
            },
        },
        addOn: {
            price: {
                needs: { price: true },
                compute: (addOn) => Number(addOn.price),
            },
        },
    },
});
