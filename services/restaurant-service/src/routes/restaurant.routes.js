import { Router } from "express";
import { create, getMyRestaurant, getById, update } from "../controllers/restaurant.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import {
    createRestaurantSchema,
    updateRestaurantSchema,
} from "../validations/restaurant.schema.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// POST /api/v1/restaurants          — owner creates restaurant
router.post("/", authorize("owner"), validate(createRestaurantSchema), create);

// GET  /api/v1/restaurants/me       — owner gets their restaurant
router.get("/me", authorize("owner"), getMyRestaurant);

// GET  /api/v1/restaurants/:id      — any authenticated user
router.get("/:id", getById);

// PATCH /api/v1/restaurants/:id     — owner updates restaurant
router.patch("/:id", authorize("owner"), validate(updateRestaurantSchema), update);

export default router;
