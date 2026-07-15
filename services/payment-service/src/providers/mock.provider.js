import crypto from "crypto";
import { randomUUID } from "crypto";
import config from "../config/index.js";
import logger from "../utils/logger.js";

// Mimics Razorpay's order-creation response shape and its webhook
// event/signature format, signed with a local secret instead of a real
// gateway — so the rest of the codebase (webhook verification, event
// parsing) is identical to what razorpay.provider.js will do for real.

export const createOrder = async ({ amount, currency, receipt }) => {
    const providerOrderId = `order_mock_${randomUUID()}`;
    logger.info("Mock provider: order created", { providerOrderId, amount, currency });
    return {
        providerOrderId,
        raw: { id: providerOrderId, amount: Math.round(amount * 100), currency, receipt, status: "created" },
    };
};

export const verifyWebhookSignature = (rawBody, signatureHeader) => {
    if (!signatureHeader) return false;
    const expected = crypto
        .createHmac("sha256", config.payment.mockWebhookSecret)
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

// Test helper — builds a signed mock webhook request body, so a client can
// simulate the gateway calling back without needing a real payment provider.
export const buildMockWebhookEvent = (providerOrderId, { captured = true } = {}) => {
    const body = {
        entity: "event",
        event: captured ? "payment.captured" : "payment.failed",
        payload: {
            payment: {
                entity: {
                    id: `pay_mock_${randomUUID()}`,
                    order_id: providerOrderId,
                    status: captured ? "captured" : "failed",
                },
            },
        },
        created_at: Math.floor(Date.now() / 1000),
    };
    const rawBody = Buffer.from(JSON.stringify(body));
    const signature = crypto
        .createHmac("sha256", config.payment.mockWebhookSecret)
        .update(rawBody)
        .digest("hex");
    return { rawBody, signature };
};
