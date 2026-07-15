import { Router } from "express";
import { razorpayWebhook } from "../controllers/webhook.controller.js";

const router = Router();

// POST /api/v1/webhooks/razorpay — provider calls back here directly (public,
// no JWT; verified via signature). Mounted with express.raw() in app.js so
// the handler sees the exact bytes the provider signed.
router.post("/razorpay", razorpayWebhook);

export default router;
