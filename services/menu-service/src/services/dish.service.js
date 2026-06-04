import { prisma } from "../config/db.js";

const throwNotFound = (msg) => {
    const e = new Error(msg);
    e.statusCode = 404;
    e.code = "NOT_FOUND";
    throw e;
};

const DISH_INCLUDE = {
    category: { select: { id: true, name: true } },
    customizations: { include: { options: true } },
    addOnGroups: { include: { addOns: true } },
};

// ── Create ────────────────────────────────────────────────────────
export const createDish = async (restaurantId, data) => {
    // Verify category belongs to this restaurant
    const category = await prisma.category.findFirst({
        where: { id: data.categoryId, restaurantId },
    });
    if (!category) throwNotFound("Category not found or does not belong to this restaurant");

    return prisma.dish.create({
        data: { ...data, restaurantId },
        include: DISH_INCLUDE,
    });
};

// ── Get dishes by restaurant ──────────────────────────────────────
export const getDishesByRestaurant = async (restaurantId, categoryId = null) => {
    return prisma.dish.findMany({
        where: { restaurantId, ...(categoryId ? { categoryId } : {}), isAvailable: true },
        orderBy: { sortOrder: "asc" },
        include: DISH_INCLUDE,
    });
};

// ── Get all dishes including unavailable (owner view) ─────────────
export const getAllDishesForOwner = async (restaurantId, categoryId = null) => {
    return prisma.dish.findMany({
        where: { restaurantId, ...(categoryId ? { categoryId } : {}) },
        orderBy: { sortOrder: "asc" },
        include: DISH_INCLUDE,
    });
};

// ── Get single dish ───────────────────────────────────────────────
export const getDishById = async (id, restaurantId) => {
    const dish = await prisma.dish.findFirst({
        where: { id, restaurantId },
        include: DISH_INCLUDE,
    });
    if (!dish) throwNotFound("Dish not found");
    return dish;
};

// ── Update ────────────────────────────────────────────────────────
export const updateDish = async (id, restaurantId, data) => {
    const dish = await prisma.dish.findFirst({ where: { id, restaurantId } });
    if (!dish) throwNotFound("Dish not found");
    return prisma.dish.update({ where: { id }, data, include: DISH_INCLUDE });
};

// ── Toggle availability ───────────────────────────────────────────
export const toggleAvailability = async (id, restaurantId, isAvailable) => {
    const dish = await prisma.dish.findFirst({ where: { id, restaurantId } });
    if (!dish) throwNotFound("Dish not found");
    return prisma.dish.update({
        where: { id },
        data: { isAvailable, status: isAvailable ? "available" : "out_of_stock" },
        include: DISH_INCLUDE,
    });
};

// ── Delete (soft) ─────────────────────────────────────────────────
export const deleteDish = async (id, restaurantId) => {
    const dish = await prisma.dish.findFirst({ where: { id, restaurantId } });
    if (!dish) throwNotFound("Dish not found");
    return prisma.dish.update({ where: { id }, data: { isAvailable: false, status: "hidden" } });
};

// ── Add customization ─────────────────────────────────────────────
export const addCustomization = async (dishId, restaurantId, { name, isRequired, options }) => {
    const dish = await prisma.dish.findFirst({ where: { id: dishId, restaurantId } });
    if (!dish) throwNotFound("Dish not found");

    return prisma.customization.create({
        data: {
            dishId,
            name,
            isRequired,
            options: { create: options },
        },
        include: { options: true },
    });
};

// ── Add add-on group ──────────────────────────────────────────────
export const addAddOnGroup = async (
    dishId,
    restaurantId,
    { name, minSelect, maxSelect, addOns }
) => {
    const dish = await prisma.dish.findFirst({ where: { id: dishId, restaurantId } });
    if (!dish) throwNotFound("Dish not found");

    return prisma.addOnGroup.create({
        data: {
            dishId,
            name,
            minSelect,
            maxSelect,
            addOns: { create: addOns },
        },
        include: { addOns: true },
    });
};

// ── Reorder dishes ────────────────────────────────────────────────
export const reorderDishes = async (restaurantId, orderedIds) => {
    const updates = orderedIds.map((id, index) =>
        prisma.dish.updateMany({ where: { id, restaurantId }, data: { sortOrder: index } })
    );
    return prisma.$transaction(updates);
};
