import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import paymentRoutes from "./routes/payment.routes.js";
import webhookRoutes from "./routes/webhook.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import { sendError } from "./utils/response.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

// ── Health ─────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "payment-service",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

// ── Webhook — must be mounted with a RAW body parser, and BEFORE the
//    global express.json() below, so signature verification sees the
//    exact bytes the provider signed rather than a re-serialized copy ──
app.use("/api/v1/webhooks", express.raw({ type: "application/json" }), webhookRoutes);

// ── Body parser (everything else) ─────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────────────────
app.use("/api/v1/payments", paymentRoutes);

// ── 404 ────────────────────────────────────────────────────────────
app.use((req, res) =>
    sendError(res, 404, "ROUTE_NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`)
);

// ── Error handler ──────────────────────────────────────────────────
app.use(errorHandler);

export default app;
