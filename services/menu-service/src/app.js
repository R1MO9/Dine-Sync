import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import categoryRoutes from "./routes/category.routes.js";
import dishRoutes from "./routes/dish.routes.js";
import publicRoutes from "./routes/public.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import { sendError } from "./utils/response.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

// ── Body Parser ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health ────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "menu-service",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

// ── Public routes (no auth — for QR scan) ────────────────────────
app.use("/api/v1/menu/public", publicRoutes);

// ── Protected routes (owner/manager) ─────────────────────────────
app.use("/api/v1/menu/categories", categoryRoutes);
app.use("/api/v1/menu/dishes", dishRoutes);

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) =>
    sendError(res, 404, "ROUTE_NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`)
);

// ── Error handler ─────────────────────────────────────────────────
app.use(errorHandler);

export default app;
