import { Router } from "express";
import {
    create,
    getAll,
    getById,
    update,
    remove,
    reorder,
} from "../controllers/category.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import {
    createCategorySchema,
    updateCategorySchema,
    reorderSchema,
} from "../validations/menu.schema.js";

const router = Router();

router.use(authenticate);

// POST   /api/v1/menu/categories              — create category
router.post("/", authorize("owner"), validate(createCategorySchema), create);

// GET    /api/v1/menu/categories              — list all categories (owner view)
router.get("/", authorize("owner", "floor_manager"), getAll);

// GET    /api/v1/menu/categories/:id          — single category
router.get("/:id", authorize("owner", "floor_manager"), getById);

// PATCH  /api/v1/menu/categories/reorder      — reorder categories
router.patch("/reorder", authorize("owner"), validate(reorderSchema), reorder);

// PATCH  /api/v1/menu/categories/:id          — update category
router.patch("/:id", authorize("owner"), validate(updateCategorySchema), update);

// DELETE /api/v1/menu/categories/:id          — soft delete category
router.delete("/:id", authorize("owner"), remove);

export default router;
