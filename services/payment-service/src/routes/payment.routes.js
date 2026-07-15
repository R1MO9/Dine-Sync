import { Router } from "express";
import { createOrder, getById } from "../controllers/payment.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { createPaymentOrderSchema } from "../validations/payment.schema.js";

const router = Router();

router.use(authenticate);

// POST /api/v1/payments/orders — create a provider order for checkout
router.post("/orders", validate(createPaymentOrderSchema), createOrder);

// GET  /api/v1/payments/:id     — check payment status
router.get("/:id", getById);

export default router;
