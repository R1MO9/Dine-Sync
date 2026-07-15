import { z } from "zod";

export const createPaymentOrderSchema = z.object({
    orderId: z.string({ required_error: "Order ID is required" }).uuid(),
    restaurantId: z.string({ required_error: "Restaurant ID is required" }).uuid(),
    amount: z.number({ required_error: "Amount is required" }).positive(),
    currency: z.string().length(3).default("INR"),
});
