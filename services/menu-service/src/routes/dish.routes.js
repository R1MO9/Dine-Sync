import { Router } from "express";
import {
    create,
    getAll,
    getById,
    update,
    toggleDishAvailability,
    remove,
    createCustomization,
    createAddOnGroup,
    reorder,
} from "../controllers/dish.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import {
    createDishSchema,
    updateDishSchema,
    toggleAvailabilitySchema,
    createCustomizationSchema,
    createAddOnGroupSchema,
    reorderSchema,
} from "../validations/menu.schema.js";

const router = Router();

router.use(authenticate);

// POST   /api/v1/menu/dishes                          — create dish
router.post("/", authorize("owner"), validate(createDishSchema), create);

// GET    /api/v1/menu/dishes?categoryId=xxx           — list all dishes (owner view)
router.get("/", authorize("owner", "floor_manager"), getAll);

// PATCH  /api/v1/menu/dishes/reorder                  — reorder dishes
router.patch("/reorder", authorize("owner"), validate(reorderSchema), reorder);

// GET    /api/v1/menu/dishes/:id                      — single dish
router.get("/:id", authorize("owner", "floor_manager"), getById);

// PATCH  /api/v1/menu/dishes/:id                      — update dish
router.patch("/:id", authorize("owner"), validate(updateDishSchema), update);

// PATCH  /api/v1/menu/dishes/:id/availability         — toggle availability
router.patch(
    "/:id/availability",
    authorize("owner", "floor_manager"),
    validate(toggleAvailabilitySchema),
    toggleDishAvailability
);

// DELETE /api/v1/menu/dishes/:id                      — soft delete dish
router.delete("/:id", authorize("owner"), remove);

// POST   /api/v1/menu/dishes/:id/customizations       — add customization
router.post(
    "/:id/customizations",
    authorize("owner"),
    validate(createCustomizationSchema),
    createCustomization
);

// POST   /api/v1/menu/dishes/:id/addons               — add add-on group
router.post("/:id/addons", authorize("owner"), validate(createAddOnGroupSchema), createAddOnGroup);

export default router;
