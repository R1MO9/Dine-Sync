import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import notificationRoutes from "./routes/notification.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import { sendError } from "./utils/response.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health ─────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "notification-service",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

// ── Routes ─────────────────────────────────────────────────────────
app.use("/api/v1/notifications", notificationRoutes);

// ── 404 ────────────────────────────────────────────────────────────
app.use((req, res) =>
    sendError(res, 404, "ROUTE_NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`)
);

// ── Error handler ──────────────────────────────────────────────────
app.use(errorHandler);

export default app;
