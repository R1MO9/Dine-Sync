import { z } from "zod";

const orderItemSchema = z.object({
    dishId: z.string({ required_error: "Dish ID is required" }).uuid(),
    quantity: z.number().int().positive().default(1),
    customizations: z
        .array(
            z.object({
                customizationId: z.string().uuid(),
                optionId: z.string().uuid(),
                label: z.string(),
                extraPrice: z.number().min(0).default(0),
            })
        )
        .optional()
        .default([]),
    addOns: z
        .array(
            z.object({
                addOnId: z.string().uuid(),
                name: z.string(),
                price: z.number().min(0).default(0),
            })
        )
        .optional()
        .default([]),
    notes: z.string().max(255).optional(),
});

export const placeOrderSchema = z.object({
    restaurantId: z.string({ required_error: "Restaurant ID is required" }).uuid(),
    tableId: z.string({ required_error: "Table ID is required" }).uuid(),
    items: z.array(orderItemSchema).min(1, "At least one item is required"),
    notes: z.string().max(500).optional(),
});

export const updateStatusSchema = z.object({
    status: z.enum(["approved", "in_progress", "ready", "served", "cancelled"], {
        errorMap: () => ({ message: "Invalid order status" }),
    }),
    note: z.string().max(255).optional(),
});
