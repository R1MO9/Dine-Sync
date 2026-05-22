import cors from "cors";
import config from "../config.js";

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, server-to-server)
        if (!origin) return callback(null, true);

        const allowed = config.cors.origin;

        // Wildcard — allow all (development only)
        if (allowed === "*") return callback(null, true);

        if (allowed.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },

    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

    allowedHeaders: ["Content-Type", "Authorization", "X-Restaurant-ID", "X-Request-ID"],

    exposedHeaders: ["X-Request-ID", "Retry-After"],

    credentials: true,

    maxAge: 86400, // preflight cache: 24 hours
};
export default cors(corsOptions);
