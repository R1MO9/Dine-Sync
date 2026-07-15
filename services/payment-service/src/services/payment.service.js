import { prisma } from "../config/db.js";
import config from "../config/index.js";
import provider from "../providers/index.js";
import { publishEvent } from "../kafka/producer.js";
import { TOPICS } from "../kafka/topics.js";
import logger from "../utils/logger.js";

export const createPaymentOrder = async ({ orderId, restaurantId, amount, currency }) => {
    const { providerOrderId, raw } = await provider.createOrder({
        amount,
        currency,
        receipt: orderId,
    });

    const payment = await prisma.payment.create({
        data: {
            restaurantId,
            orderId,
            amount,
            currency,
            provider: config.payment.provider,
            providerOrderId,
        },
    });

    logger.info("Payment order created", { paymentId: payment.id, orderId, providerOrderId });
    return { payment, providerOrder: raw };
};

export const getPaymentById = async (id, restaurantId) => {
    const payment = await prisma.payment.findFirst({ where: { id, restaurantId } });
    if (!payment) {
        const err = new Error("Payment not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return payment;
};

export const handleWebhook = async (rawBody, signatureHeader) => {
    if (!provider.verifyWebhookSignature(rawBody, signatureHeader)) {
        const err = new Error("Invalid webhook signature");
        err.statusCode = 400;
        err.code = "INVALID_SIGNATURE";
        throw err;
    }

    const { providerOrderId, providerPaymentId, status } = provider.parseWebhookEvent(rawBody);

    const payment = await prisma.payment.findFirst({ where: { providerOrderId } });
    if (!payment) {
        logger.warn("Webhook received for unknown payment order", { providerOrderId });
        return null;
    }

    const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { status, providerPaymentId, signature: signatureHeader },
    });

    if (status === "paid") {
        await publishEvent(
            TOPICS.PAYMENT_CONFIRMED,
            { orderId: payment.orderId, restaurantId: payment.restaurantId },
            payment.restaurantId
        );
    }

    logger.info("Payment webhook processed", { paymentId: payment.id, status });
    return updated;
};
