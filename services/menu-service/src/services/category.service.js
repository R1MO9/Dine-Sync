import { prisma } from "../config/db.js";

const throwNotFound = (msg) => {
    const e = new Error(msg);
    e.statusCode = 404;
    e.code = "NOT_FOUND";
    throw e;
};

// ── Create ────────────────────────────────────────────────────────
export const createCategory = async (restaurantId, data) => {
    return prisma.category.create({ data: { ...data, restaurantId } });
};

// ── Get all categories for a restaurant ──────────────────────────
export const getCategoriesByRestaurant = async (restaurantId, includeInactive = false) => {
    return prisma.category.findMany({
        where: { restaurantId, ...(includeInactive ? {} : { isActive: true }) },
        orderBy: { sortOrder: "asc" },
        include: {
            dishes: {
                where: { isAvailable: true },
                orderBy: { sortOrder: "asc" },
            },
        },
    });
};

// ── Get single category ───────────────────────────────────────────
export const getCategoryById = async (id, restaurantId) => {
    const category = await prisma.category.findFirst({
        where: { id, restaurantId },
        include: { dishes: { orderBy: { sortOrder: "asc" } } },
    });
    if (!category) throwNotFound("Category not found");
    return category;
};

// ── Update ────────────────────────────────────────────────────────
export const updateCategory = async (id, restaurantId, data) => {
    const category = await prisma.category.findFirst({ where: { id, restaurantId } });
    if (!category) throwNotFound("Category not found");
    return prisma.category.update({ where: { id }, data });
};

// ── Delete (soft) ─────────────────────────────────────────────────
export const deleteCategory = async (id, restaurantId) => {
    const category = await prisma.category.findFirst({ where: { id, restaurantId } });
    if (!category) throwNotFound("Category not found");
    return prisma.category.update({ where: { id }, data: { isActive: false } });
};

// ── Reorder ───────────────────────────────────────────────────────
export const reorderCategories = async (restaurantId, orderedIds) => {
    const updates = orderedIds.map((id, index) =>
        prisma.category.updateMany({ where: { id, restaurantId }, data: { sortOrder: index } })
    );
    return prisma.$transaction(updates);
};
