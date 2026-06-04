import {
    createDish,
    getAllDishesForOwner,
    getDishById,
    updateDish,
    toggleAvailability,
    deleteDish,
    addCustomization,
    addAddOnGroup,
    reorderDishes,
} from "../services/dish.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

// POST /api/v1/menu/dishes
export const create = async (req, res, next) => {
    try {
        const dish = await createDish(req.user.restaurantId, req.body);
        logger.info("Dish created", { dishId: dish.id, restaurantId: req.user.restaurantId });
        return sendSuccess(res, 201, { dish }, "Dish created successfully");
    } catch (err) {
        next(err);
    }
};

// GET /api/v1/menu/dishes
export const getAll = async (req, res, next) => {
    try {
        const { categoryId } = req.query;
        const dishes = await getAllDishesForOwner(req.user.restaurantId, categoryId || null);
        return sendSuccess(res, 200, { dishes });
    } catch (err) {
        next(err);
    }
};

// GET /api/v1/menu/dishes/:id
export const getById = async (req, res, next) => {
    try {
        const dish = await getDishById(req.params.id, req.user.restaurantId);
        return sendSuccess(res, 200, { dish });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/v1/menu/dishes/:id
export const update = async (req, res, next) => {
    try {
        const dish = await updateDish(req.params.id, req.user.restaurantId, req.body);
        return sendSuccess(res, 200, { dish }, "Dish updated successfully");
    } catch (err) {
        next(err);
    }
};

// PATCH /api/v1/menu/dishes/:id/availability
export const toggleDishAvailability = async (req, res, next) => {
    try {
        const { isAvailable } = req.body;
        const dish = await toggleAvailability(req.params.id, req.user.restaurantId, isAvailable);
        return sendSuccess(
            res,
            200,
            { dish },
            `Dish marked as ${isAvailable ? "available" : "unavailable"}`
        );
    } catch (err) {
        next(err);
    }
};

// DELETE /api/v1/menu/dishes/:id
export const remove = async (req, res, next) => {
    try {
        await deleteDish(req.params.id, req.user.restaurantId);
        logger.info("Dish removed", { dishId: req.params.id });
        return sendSuccess(res, 200, null, "Dish removed successfully");
    } catch (err) {
        next(err);
    }
};

// POST /api/v1/menu/dishes/:id/customizations
export const createCustomization = async (req, res, next) => {
    try {
        const customization = await addCustomization(
            req.params.id,
            req.user.restaurantId,
            req.body
        );
        return sendSuccess(res, 201, { customization }, "Customization added successfully");
    } catch (err) {
        next(err);
    }
};

// POST /api/v1/menu/dishes/:id/addons
export const createAddOnGroup = async (req, res, next) => {
    try {
        const addOnGroup = await addAddOnGroup(req.params.id, req.user.restaurantId, req.body);
        return sendSuccess(res, 201, { addOnGroup }, "Add-on group added successfully");
    } catch (err) {
        next(err);
    }
};

// PATCH /api/v1/menu/dishes/reorder
export const reorder = async (req, res, next) => {
    try {
        const { orderedIds } = req.body;
        await reorderDishes(req.user.restaurantId, orderedIds);
        return sendSuccess(res, 200, null, "Dishes reordered successfully");
    } catch (err) {
        next(err);
    }
};
