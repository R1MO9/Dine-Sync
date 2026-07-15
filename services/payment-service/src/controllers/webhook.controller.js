import { handleWebhook } from "../services/payment.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

// ── POST /api/v1/webhooks/razorpay ────────────────────────────────
// Public — verified via provider signature instead of a JWT (this is the
// route the payment provider itself calls back on).
export const razorpayWebhook = async (req, res, next) => {
    try {
        // req.body is a raw Buffer here (see app.js — express.raw() on this route)
        const signature = req.headers["x-razorpay-signature"];
        await handleWebhook(req.body, signature);
        return sendSuccess(res, 200, null, "Webhook processed");
    } catch (err) {
        logger.error("Webhook processing failed", { message: err.message });
        next(err);
    }
};
