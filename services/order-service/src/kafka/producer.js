import { Kafka } from "kafkajs";
import config from "../config/index.js";
import logger from "../utils/logger.js";

const kafka = new Kafka({
    clientId: config.kafka.clientId,
    brokers: config.kafka.brokers,
});

const producer = kafka.producer();
let connected = false;

export const connectProducer = async () => {
    await producer.connect();
    connected = true;
    logger.info("Kafka producer connected");
};

export const disconnectProducer = async () => {
    await producer.disconnect();
    connected = false;
};

/**
 * Publish an event to a Kafka topic.
 * @param {string} topic
 * @param {object} payload
 * @param {string} key  — partition key (usually restaurantId)
 */
export const publishEvent = async (topic, payload, key = null) => {
    if (!connected) {
        logger.warn("Kafka producer not connected — skipping event", { topic });
        return;
    }

    try {
        await producer.send({
            topic,
            messages: [
                {
                    key: key || payload.restaurantId || null,
                    value: JSON.stringify({ ...payload, publishedAt: new Date().toISOString() }),
                },
            ],
        });
        logger.info("Kafka event published", { topic, key });
    } catch (err) {
        logger.error("Kafka publish failed", { topic, message: err.message });
        // Do not throw — Kafka failure should not break the HTTP response
    }
};
