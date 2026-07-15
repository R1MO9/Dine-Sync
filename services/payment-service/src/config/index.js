import "dotenv/config";

const config = {
    port: process.env.PORT || 8006,
    env: process.env.NODE_ENV || "development",

    db: {
        url: process.env.DATABASE_URL,
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
    },

    kafka: {
        brokers: (process.env.KAFKA_BROKERS || "localhost:29092").split(","),
        clientId: "payment-service",
        groupId: "payment-service-group",
    },

    payment: {
        provider: process.env.PAYMENT_PROVIDER || "mock",
        mockWebhookSecret: process.env.MOCK_WEBHOOK_SECRET || "dev-mock-webhook-secret-change-me",
        razorpay: {
            keyId: process.env.RAZORPAY_KEY_ID,
            keySecret: process.env.RAZORPAY_KEY_SECRET,
            webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
        },
    },
};

if (config.env === "production") {
    ["DATABASE_URL", "JWT_ACCESS_SECRET"].forEach((key) => {
        if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    });
    if (config.payment.provider === "razorpay") {
        ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"].forEach((key) => {
            if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
        });
    }
}

export default config;
