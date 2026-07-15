import { Kafka } from "kafkajs";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { TOPICS } from "./topics.js";
import { handlePaymentConfirmed } from "../services/order.service.js";

const kafka = new Kafka({
    clientId: `${config.kafka.clientId}-consumer`,
    brokers: config.kafka.brokers,
});

const consumer = kafka.consumer({ groupId: config.kafka.groupId });

export const connectConsumer = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: TOPICS.PAYMENT_CONFIRMED, fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            try {
                const payload = JSON.parse(message.value.toString());
                logger.info("Kafka event received", { topic, orderId: payload.orderId });

                if (topic === TOPICS.PAYMENT_CONFIRMED) {
                    await handlePaymentConfirmed(payload);
                }
            } catch (err) {
                logger.error("Kafka consumer error", { topic, message: err.message });
            }
        },
    });

    logger.info("Kafka consumer connected and listening");
};

export const disconnectConsumer = async () => {
    await consumer.disconnect();
};
