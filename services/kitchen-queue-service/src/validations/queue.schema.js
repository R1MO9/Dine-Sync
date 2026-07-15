import { z } from "zod";

export const updateTicketStatusSchema = z.object({
    status: z.enum(["preparing", "ready", "served", "cancelled"], {
        errorMap: () => ({ message: "Invalid queue ticket status" }),
    }),
});
