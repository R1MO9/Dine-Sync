import { prisma } from "../config/db.js";

/**
 * Public menu — called when customer scans QR code.
 * Returns full menu grouped by category for a given restaurantId.
 * Only returns active categories and available dishes.
 */
export const getPublicMenu = async (restaurantId) => {
    const categories = await prisma.category.findMany({
        where: { restaurantId, isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
            dishes: {
                where: { restaurantId, isAvailable: true, status: "available" },
                orderBy: { sortOrder: "asc" },
                include: {
                    customizations: { include: { options: true } },
                    addOnGroups: { include: { addOns: { where: { isAvailable: true } } } },
                },
            },
        },
    });

    // Filter out empty categories
    return categories.filter((c) => c.dishes.length > 0);
};

/**
 * Get single dish details — shown when customer taps a dish.
 */
export const getPublicDish = async (dishId, restaurantId) => {
    const dish = await prisma.dish.findFirst({
        where: { id: dishId, restaurantId, isAvailable: true, status: "available" },
        include: {
            category: { select: { id: true, name: true } },
            customizations: { include: { options: true } },
            addOnGroups: { include: { addOns: { where: { isAvailable: true } } } },
        },
    });

    if (!dish) {
        const err = new Error("Dish not found or unavailable");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }

    return dish;
};
