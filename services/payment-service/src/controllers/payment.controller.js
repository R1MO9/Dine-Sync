import { createPaymentOrder, getPaymentById } from "../services/payment.service.js";
import { sendSuccess } from "../utils/response.js";
import logger from "../utils/logger.js";

// ── POST /api/v1/payments/orders ──────────────────────────────────
export const createOrder = async (req, res, next) => {
    try {
        const { payment, providerOrder } = await createPaymentOrder(req.body);
        logger.info("Payment order created via API", { paymentId: payment.id });
        return sendSuccess(res, 201, { payment, providerOrder }, "Payment order created");
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/payments/:id ──────────────────────────────────────
export const getById = async (req, res, next) => {
    try {
        const payment = await getPaymentById(req.params.id, req.user.restaurantId);
        return sendSuccess(res, 200, { payment });
    } catch (err) {
        next(err);
    }
};
