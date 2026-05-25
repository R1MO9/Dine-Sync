import {
    createRestaurant,
    getRestaurantByOwner,
    getRestaurantById,
    updateRestaurant,
} from "../services/restaurant.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

// ── POST /api/v1/restaurants ──────────────────────────────────────
export const create = async (req, res, next) => {
    try {
        const restaurant = await createRestaurant(req.body, req.user.userId);
        logger.info("Restaurant created", {
            restaurantId: restaurant.id,
            ownerId: req.user.userId,
        });
        return sendSuccess(res, 201, { restaurant }, "Restaurant created successfully");
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/restaurants/me ────────────────────────────────────
export const getMyRestaurant = async (req, res, next) => {
    try {
        const restaurant = await getRestaurantByOwner(req.user.userId);
        return sendSuccess(res, 200, { restaurant });
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/restaurants/:id ───────────────────────────────────
export const getById = async (req, res, next) => {
    try {
        const restaurant = await getRestaurantById(req.params.id);
        return sendSuccess(res, 200, { restaurant });
    } catch (err) {
        next(err);
    }
};

// ── PATCH /api/v1/restaurants/:id ────────────────────────────────
export const update = async (req, res, next) => {
    try {
        const restaurant = await updateRestaurant(req.params.id, req.user.userId, req.body);
        logger.info("Restaurant updated", { restaurantId: req.params.id });
        return sendSuccess(res, 200, { restaurant }, "Restaurant updated successfully");
    } catch (err) {
        next(err);
    }
};
