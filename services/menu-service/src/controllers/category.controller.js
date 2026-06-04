import {
    createCategory,
    getCategoriesByRestaurant,
    getCategoryById,
    updateCategory,
    deleteCategory,
    reorderCategories,
} from "../services/category.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

// POST /api/v1/menu/categories
export const create = async (req, res, next) => {
    try {
        const category = await createCategory(req.user.restaurantId, req.body);
        logger.info("Category created", {
            categoryId: category.id,
            restaurantId: req.user.restaurantId,
        });
        return sendSuccess(res, 201, { category }, "Category created successfully");
    } catch (err) {
        next(err);
    }
};

// GET /api/v1/menu/categories
export const getAll = async (req, res, next) => {
    try {
        const includeInactive = req.query.includeInactive === "true";
        const categories = await getCategoriesByRestaurant(req.user.restaurantId, includeInactive);
        return sendSuccess(res, 200, { categories });
    } catch (err) {
        next(err);
    }
};

// GET /api/v1/menu/categories/:id
export const getById = async (req, res, next) => {
    try {
        const category = await getCategoryById(req.params.id, req.user.restaurantId);
        return sendSuccess(res, 200, { category });
    } catch (err) {
        next(err);
    }
};

// PATCH /api/v1/menu/categories/:id
export const update = async (req, res, next) => {
    try {
        const category = await updateCategory(req.params.id, req.user.restaurantId, req.body);
        return sendSuccess(res, 200, { category }, "Category updated successfully");
    } catch (err) {
        next(err);
    }
};

// DELETE /api/v1/menu/categories/:id
export const remove = async (req, res, next) => {
    try {
        await deleteCategory(req.params.id, req.user.restaurantId);
        logger.info("Category removed", { categoryId: req.params.id });
        return sendSuccess(res, 200, null, "Category removed successfully");
    } catch (err) {
        next(err);
    }
};

// PATCH /api/v1/menu/categories/reorder
export const reorder = async (req, res, next) => {
    try {
        const { orderedIds } = req.body;
        await reorderCategories(req.user.restaurantId, orderedIds);
        return sendSuccess(res, 200, null, "Categories reordered successfully");
    } catch (err) {
        next(err);
    }
};
