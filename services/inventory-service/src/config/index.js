import "dotenv/config";

const config = {
    port: process.env.PORT || 8007,
    env: process.env.NODE_ENV || "development",

    db: {
        url: process.env.DATABASE_URL,
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
    },

    kafka: {
        brokers: (process.env.KAFKA_BROKERS || "localhost:29092").split(","),
        clientId: "inventory-service",
        groupId: "inventory-service-group",
    },
};

if (config.env === "production") {
    ["DATABASE_URL", "JWT_ACCESS_SECRET"].forEach((key) => {
        if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    });
}

export default config;
