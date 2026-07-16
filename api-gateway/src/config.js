import "dotenv/config";

const config = {
    port: process.env.PORT || 8000,
    env: process.env.NODE_ENV || "development",

    jwt: {
        secret: process.env.JWT_SECRET,
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
    },

    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: process.env.REDIS_PORT || 6379,
    },

    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"),
        maxGlobal: parseInt(process.env.RATE_LIMIT_MAX_GLOBAL || "200"),
        maxPerTenant: parseInt(process.env.RATE_LIMIT_MAX_TENANT || "100"),
    },

    cors: {
        origin:
            !process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === "*"
                ? "*"
                : process.env.CORS_ORIGIN.split(","),
    },

    proxy: {
        timeoutMs: parseInt(process.env.PROXY_TIMEOUT_MS || "10000"),
    },

    services: {
        auth: process.env.AUTH_SERVICE_URL || "http://localhost:8001",
        restaurant: process.env.RESTAURANT_SERVICE_URL || "http://localhost:8002",
        menu: process.env.MENU_SERVICE_URL || "http://localhost:8003",
        order: process.env.ORDER_SERVICE_URL || "http://localhost:8004",
        kitchen: process.env.KITCHEN_SERVICE_URL || "http://localhost:8005",
        payment: process.env.PAYMENT_SERVICE_URL || "http://localhost:8006",
        inventory: process.env.INVENTORY_SERVICE_URL || "http://localhost:8007",
        notification: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8008",
    },
};

// Guard required values in production
if (config.env === "production") {
    ["JWT_SECRET"].forEach((key) => {
        if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    });
}

export default config;
