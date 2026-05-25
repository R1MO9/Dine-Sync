import "dotenv/config";

const config = {
    port: process.env.PORT || 8002,
    env: process.env.NODE_ENV || "development",

    db: {
        url: process.env.DATABASE_URL,
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET,
        inviteSecret: process.env.JWT_INVITE_SECRET,
    },

    app: {
        frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    },

    services: {
        auth: process.env.AUTH_SERVICE_URL || "http://localhost:8001",
    },

    email: {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true",
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || "noreply@dinesync.com",
    },

    aws: {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3Bucket: process.env.AWS_S3_BUCKET,
    },
};

if (config.env === "production") {
    ["DATABASE_URL", "JWT_ACCESS_SECRET", "JWT_INVITE_SECRET", "SMTP_USER", "SMTP_PASS"].forEach(
        (key) => {
            if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
        }
    );
}

export default config;
