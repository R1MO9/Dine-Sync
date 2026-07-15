import { Router } from "express";
import { live, getById, updateStatus } from "../controllers/queue.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { updateTicketStatusSchema } from "../validations/queue.schema.js";

const router = Router();

router.use(authenticate);

// GET   /api/v1/queue            — live tickets (chef/floor_manager)
router.get("/", authorize("chef", "floor_manager"), live);

// GET   /api/v1/queue/:id         — single ticket
router.get("/:id", authorize("chef", "floor_manager"), getById);

// PATCH /api/v1/queue/:id/status  — advance ticket through prep
router.patch(
    "/:id/status",
    authorize("chef", "floor_manager"),
    validate(updateTicketStatusSchema),
    updateStatus
);

export default router;
