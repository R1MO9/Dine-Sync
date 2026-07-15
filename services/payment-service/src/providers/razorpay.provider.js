import crypto from "crypto";
import Razorpay from "razorpay";
import config from "../config/index.js";
import logger from "../utils/logger.js";

// Real Razorpay integration. Selected via PAYMENT_PROVIDER=razorpay.
// Requires RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET / RAZORPAY_WEBHOOK_SECRET —
// this file is untested without real Razorpay credentials.

const client = new Razorpay({
    key_id: config.payment.razorpay.keyId,
    key_secret: config.payment.razorpay.keySecret,
});

export const createOrder = async ({ amount, currency, receipt }) => {
    const order = await client.orders.create({
        amount: Math.round(amount * 100), // Razorpay expects the smallest currency unit (paise)
        currency,
        receipt,
    });
    logger.info("Razorpay order created", { providerOrderId: order.id });
    return { providerOrderId: order.id, raw: order };
};

export const verifyWebhookSignature = (rawBody, signatureHeader) => {
    if (!signatureHeader) return false;
    const expected = crypto
        .createHmac("sha256", config.payment.razorpay.webhookSecret)
        .update(rawBody)
        .digest("hex");
    return expected === signatureHeader;
};

export const parseWebhookEvent = (rawBody) => {
    const body = JSON.parse(rawBody.toString());
    const payment = body.payload?.payment?.entity;
    const status = body.event === "payment.captured" ? "paid" : "failed";
    return {
        providerOrderId: payment?.order_id,
        providerPaymentId: payment?.id,
        status,
    };
};
