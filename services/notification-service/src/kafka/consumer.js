import { Kafka } from "kafkajs";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { TOPICS } from "./topics.js";
import { recordAndBroadcast } from "../services/notification.service.js";

const kafka = new Kafka({
    clientId: `${config.kafka.clientId}-consumer`,
    brokers: config.kafka.brokers,
});

const consumer = kafka.consumer({ groupId: config.kafka.groupId });

/**
 * @param {import("socket.io").Server} io
 */
export const connectConsumer = async (io) => {
    await consumer.connect();
    await Promise.all(
        Object.values(TOPICS).map((topic) => consumer.subscribe({ topic, fromBeginning: false }))
    );

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            try {
                const payload = JSON.parse(message.value.toString());
                logger.info("Kafka event received", { topic, orderId: payload.orderId });
                await recordAndBroadcast(io, topic, payload);
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
