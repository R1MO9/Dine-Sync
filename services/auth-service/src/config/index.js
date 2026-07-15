import "dotenv/config";

const config = {
    port: process.env.PORT || 8001,
    env: process.env.NODE_ENV || "development",

    db: {
        url: process.env.DATABASE_URL,
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        refreshSecret: process.env.JWT_REFRESH_SECRET,
        accessExpiry: process.env.JWT_ACCESS_EXPIRY || "15m",
        refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    },

    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12"),
    },

    internalApiKey: process.env.INTERNAL_API_KEY,
};

// Guard required values in production
if (config.env === "production") {
    ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "INTERNAL_API_KEY"].forEach((key) => {
        if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    });
}

export default config;
