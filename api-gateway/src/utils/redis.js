import { createClient } from "redis";
import config from "../config.js";
import logger from "./logger.js";

const client = createClient({
    socket: {
        host: config.redis.host,
        port: config.redis.port,
    },
});

client.on("error", (err) => logger.error("Redis client error", { message: err.message }));
client.on("connect", () =>
    logger.info(`Redis connected at ${config.redis.host}:${config.redis.port}`)
);
client.on("reconnecting", () => logger.warn("Redis reconnecting..."));

(async () => {
    await client.connect();
})();

export default client;
