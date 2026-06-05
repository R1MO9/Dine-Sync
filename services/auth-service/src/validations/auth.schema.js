import { z } from "zod";

// ── Register ──────────────────────────────────────────────────────
export const registerSchema = z.object({
    name: z
        .string({ required_error: "Name is required" })
        .min(2, "Name must be at least 2 characters")
        .max(64, "Name must be at most 64 characters")
        .trim(),

    email: z
        .string({ required_error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),

    password: z
        .string({ required_error: "Password is required" })
        .min(8, "Password must be at least 8 characters")
        .max(64, "Password must be at most 64 characters"),

    role: z
        .enum(["owner", "floor_manager", "chef", "customer"], {
            errorMap: () => ({
                message: "Role must be one of: owner, floor_manager, chef, customer",
            }),
        })
        .default("customer"),
});

// ── Login ─────────────────────────────────────────────────────────
export const loginSchema = z.object({
    email: z
        .string({ required_error: "Email is required" })
        .email("Invalid email address")
        .toLowerCase()
        .trim(),

    password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

// ── Refresh Token ─────────────────────────────────────────────────
export const refreshTokenSchema = z.object({
    refreshToken: z
        .string({ required_error: "Refresh token is required" })
        .min(1, "Refresh token is required"),
});

// ── Internal: Link Restaurant ─────────────────────────────────────
export const linkRestaurantSchema = z.object({
    restaurantId: z.string({ required_error: "Restaurant ID is required" }).uuid("Invalid ID"),
});
