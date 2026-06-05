import { z } from "zod";

// ── Category ──────────────────────────────────────────────────────
export const createCategorySchema = z.object({
    name: z.string({ required_error: "Name is required" }).min(2).max(100).trim(),
    description: z.string().max(255).trim().optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(2).max(100).trim().optional(),
    description: z.string().max(255).trim().optional(),
    sortOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
});

// ── Dish ──────────────────────────────────────────────────────────
export const createDishSchema = z.object({
    categoryId: z.string({ required_error: "Category ID is required" }).uuid(),
    name: z.string({ required_error: "Name is required" }).min(2).max(150).trim(),
    description: z.string().max(500).trim().optional(),
    price: z.number({ required_error: "Price is required" }).positive().multipleOf(0.01),
    foodType: z.enum(["veg", "non_veg", "vegan", "egg"]).default("veg"),
    spiceLevel: z.enum(["none", "mild", "medium", "hot", "extra_hot"]).optional(),
    sortOrder: z.number().int().min(0).optional(),
});

export const updateDishSchema = z.object({
    name: z.string().min(2).max(150).trim().optional(),
    description: z.string().max(500).trim().optional(),
    price: z.number().positive().multipleOf(0.01).optional(),
    foodType: z.enum(["veg", "non_veg", "vegan", "egg"]).optional(),
    spiceLevel: z.enum(["none", "mild", "medium", "hot", "extra_hot"]).optional().nullable(),
    sortOrder: z.number().int().min(0).optional(),
});

export const toggleAvailabilitySchema = z.object({
    isAvailable: z.boolean({ required_error: "isAvailable is required" }),
});

// ── Customization ─────────────────────────────────────────────────
export const createCustomizationSchema = z.object({
    name: z.string({ required_error: "Name is required" }).min(2).max(100).trim(),
    isRequired: z.boolean().default(false),
    options: z
        .array(
            z.object({
                label: z.string().min(1).max(100).trim(),
                extraPrice: z.number().min(0).multipleOf(0.01).default(0),
                isDefault: z.boolean().default(false),
            })
        )
        .min(1, "At least one option is required"),
});

// ── Add-on Group ──────────────────────────────────────────────────
export const createAddOnGroupSchema = z.object({
    name: z.string({ required_error: "Name is required" }).min(2).max(100).trim(),
    minSelect: z.number().int().min(0).default(0),
    maxSelect: z.number().int().min(1).default(1),
    addOns: z
        .array(
            z.object({
                name: z.string().min(1).max(100).trim(),
                price: z.number().min(0).multipleOf(0.01).default(0),
            })
        )
        .min(1, "At least one add-on is required"),
});
