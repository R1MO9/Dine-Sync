import dotenv from "dotenv";

dotenv.config();

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
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"), // 1 min
        maxGlobal: parseInt(process.env.RATE_LIMIT_MAX_GLOBAL || "200"),
        maxPerTenant: parseInt(process.env.RATE_LIMIT_MAX_TENANT || "100"),
    },

    cors: {
        origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "*",
    },
};

// Guard required values in production
if (config.env === "production") {
    const required = ["JWT_SECRET"];
    required.forEach((key) => {
        if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    });
}

export default config;
