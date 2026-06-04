import { Router } from "express";
import { getMenu, getDish } from "../controllers/public.controller.js";

const router = Router();

// No auth required — these are hit directly from QR scan

// GET /api/v1/menu/public/:restaurantId                     — full menu grouped by category
router.get("/:restaurantId", getMenu);

// GET /api/v1/menu/public/:restaurantId/dishes/:dishId      — single dish detail
router.get("/:restaurantId/dishes/:dishId", getDish);

export default router;
