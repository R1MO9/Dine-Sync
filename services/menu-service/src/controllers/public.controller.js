import { getPublicMenu, getPublicDish } from "../services/public.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

// GET /api/v1/menu/public/:restaurantId
export const getMenu = async (req, res, next) => {
    try {
        const { restaurantId } = req.params;
        if (!restaurantId) return sendError(res, 400, "MISSING_PARAM", "restaurantId is required");
        const menu = await getPublicMenu(restaurantId);
        return sendSuccess(res, 200, { menu });
    } catch (err) {
        next(err);
    }
};

// GET /api/v1/menu/public/:restaurantId/dishes/:dishId
export const getDish = async (req, res, next) => {
    try {
        const { restaurantId, dishId } = req.params;
        const dish = await getPublicDish(dishId, restaurantId);
        return sendSuccess(res, 200, { dish });
    } catch (err) {
        next(err);
    }
};
