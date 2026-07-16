import { Router } from "express";
import { create, getAll, remove, resolveQrToken } from "../controllers/table.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { createTableSchema } from "../validations/restaurant.schema.js";

const router = Router();

// ── Public — hit directly after a QR scan, before any auth ─────────
// GET /api/v1/tables/qr/:qrToken
router.get("/qr/:qrToken", resolveQrToken);

router.use(authenticate);

// POST   /api/v1/tables      — owner creates a table
router.post("/", authorize("owner"), validate(createTableSchema), create);

// GET    /api/v1/tables      — owner + floor_manager view tables
router.get("/", authorize("owner", "floor_manager"), getAll);

// DELETE /api/v1/tables/:id  — owner removes a table
router.delete("/:id", authorize("owner"), remove);

export default router;
