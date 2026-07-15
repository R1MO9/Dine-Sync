import { Router } from "express";
import { create, getAll, getById, adjust, remove } from "../controllers/inventory.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { createStockItemSchema, adjustStockSchema } from "../validations/inventory.schema.js";

const router = Router();

router.use(authenticate);
router.use(authorize("owner", "floor_manager"));

// POST   /api/v1/inventory              — create/init stock item for a dish
router.post("/", validate(createStockItemSchema), create);

// GET    /api/v1/inventory              — list tracked stock items
router.get("/", getAll);

// GET    /api/v1/inventory/:id          — single stock item + recent logs
router.get("/:id", getById);

// PATCH  /api/v1/inventory/:id/adjust   — manual restock/correction
router.patch("/:id/adjust", validate(adjustStockSchema), adjust);

// DELETE /api/v1/inventory/:id          — stop tracking (soft delete)
router.delete("/:id", remove);

export default router;
