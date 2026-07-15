import { Router } from "express";
import {
    place,
    live,
    getAll,
    getByTable,
    getById,
    updateStatus,
} from "../controllers/order.controller.js";
import { authenticate, authorize, optionalAuthenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { placeOrderSchema, updateStatusSchema } from "../validations/order.schema.js";

const router = Router();

// ── Public — no auth required, but attach req.user if the customer happens
//    to be logged in (optionalAuthenticate never rejects the request) ─────

// POST /api/v1/orders — customer places order from QR page
router.post("/", optionalAuthenticate, validate(placeOrderSchema), place);

// GET /api/v1/orders/table/:tableId?restaurantId=xxx — customer polls order status
router.get("/table/:tableId", optionalAuthenticate, getByTable);

// ── Protected ─────────────────────────────────────────────────────
router.use(authenticate);

// GET  /api/v1/orders/live          — floor manager live dashboard
router.get("/live", authorize("floor_manager", "owner"), live);

// GET  /api/v1/orders               — all orders with filters (owner/manager)
router.get("/", authorize("owner", "floor_manager"), getAll);

// GET  /api/v1/orders/:id           — single order detail
router.get("/:id", authorize("owner", "floor_manager", "chef"), getById);

// PATCH /api/v1/orders/:id/status   — update order status
router.patch(
    "/:id/status",
    authorize("floor_manager", "chef", "owner"),
    validate(updateStatusSchema),
    updateStatus
);

export default router;
