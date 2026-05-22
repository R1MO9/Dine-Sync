import express from "express";
import helmet from "helmet";
import cookieParser from 'cookie-parser';

import authRoutes from "./routes/auth.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import { sendError } from "./utils/response.js";

const app = express();

// ── Security ──────────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet());
app.use(cookieParser());

// ── Body Parser ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "auth-service",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/v1/auth", authRoutes);

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
    sendError(res, 404, "ROUTE_NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`);
});

// ── Global error handler ──────────────────────────────────────────
app.use(errorHandler);

export default app;
