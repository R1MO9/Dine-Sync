import { Kafka } from "kafkajs";
import config from "../config/index.js";
import logger from "../utils/logger.js";
import { ORDER_TOPICS } from "./topics.js";
import {
    createTicketFromOrder,
    cancelTicketByOrder,
    completeTicketByOrder,
} from "../services/queue.service.js";

const kafka = new Kafka({
    clientId: `${config.kafka.clientId}-consumer`,
    brokers: config.kafka.brokers,
});

const consumer = kafka.consumer({ groupId: config.kafka.groupId });

export const connectConsumer = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: ORDER_TOPICS.ORDER_PLACED, fromBeginning: false });
    await consumer.subscribe({ topic: ORDER_TOPICS.ORDER_STATUS_UPDATED, fromBeginning: false });
    await consumer.subscribe({ topic: ORDER_TOPICS.ORDER_COMPLETED, fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ topic, message }) => {
            try {
                const payload = JSON.parse(message.value.toString());
                logger.info("Kafka event received", { topic, orderId: payload.orderId });

                if (topic === ORDER_TOPICS.ORDER_PLACED) {
                    await createTicketFromOrder(payload);
                } else if (topic === ORDER_TOPICS.ORDER_STATUS_UPDATED) {
                    if (payload.status === "cancelled") {
                        await cancelTicketByOrder(payload.orderId);
                    }
                } else if (topic === ORDER_TOPICS.ORDER_COMPLETED) {
                    await completeTicketByOrder(payload.orderId);
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
