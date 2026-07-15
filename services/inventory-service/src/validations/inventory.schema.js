import { z } from "zod";

export const createStockItemSchema = z.object({
    dishId: z.string({ required_error: "Dish ID is required" }).uuid(),
    quantity: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(10),
});

export const adjustStockSchema = z.object({
    change: z.number({ required_error: "Change is required" }).int(),
    reason: z.enum(["restock", "manual_adjustment", "correction"], {
        errorMap: () => ({ message: "Invalid stock change reason" }),
    }),
    note: z.string().max(255).optional(),
});
