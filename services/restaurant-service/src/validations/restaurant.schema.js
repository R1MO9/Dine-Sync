import { z } from "zod";

export const createRestaurantSchema = z.object({
    name: z.string({ required_error: "Name is required" }).min(2).max(100).trim(),
    subdomain: z
        .string({ required_error: "Subdomain is required" })
        .min(3)
        .max(50)
        .toLowerCase()
        .trim()
        .regex(
            /^[a-z0-9-]+$/,
            "Subdomain can only contain lowercase letters, numbers, and hyphens"
        ),
    address: z.string().max(255).trim().optional(),
    phone: z.string().max(20).trim().optional(),
});

export const updateRestaurantSchema = z.object({
    name: z.string().min(2).max(100).trim().optional(),
    address: z.string().max(255).trim().optional(),
    phone: z.string().max(20).trim().optional(),
});

export const createTableSchema = z.object({
    number: z.number({ required_error: "Table number is required" }).int().positive(),
    label: z.string().max(50).trim().optional(),
});

// ── Staff Invite ──────────────────────────────────────────────────

export const inviteStaffSchema = z.object({
    email: z
        .string({ required_error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
    role: z.enum(["floor_manager", "chef"], {
        errorMap: () => ({ message: "Role must be floor_manager or chef" }),
    }),
});

export const acceptInviteSchema = z.object({
    token: z.string({ required_error: "Invite token is required" }).min(1),
    name: z.string({ required_error: "Name is required" }).min(2).max(64).trim(),
    password: z.string({ required_error: "Password is required" }).min(8).max(64),
});
