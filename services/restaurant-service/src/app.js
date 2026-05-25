import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import restaurantRoutes from "./routes/restaurant.routes.js";
import tableRoutes from "./routes/table.routes.js";
import staffRoutes from "./routes/staff.routes.js";
import errorHandler from "./middlewares/errorHandler.js";
import { sendError } from "./utils/response.js";

const app = express();

// ── Security ──────────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet());

// ── Body Parser ───────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Health check ──────────────────────────────────────────────────
app.get("/health", (req, res) => {
    res.json({
        success: true,
        service: "restaurant-service",
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/v1/restaurants", restaurantRoutes);
app.use("/api/v1/tables", tableRoutes);
app.use("/api/v1/staff", staffRoutes);

// ── 404 ───────────────────────────────────────────────────────────
app.use((req, res) => {
    sendError(res, 404, "ROUTE_NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`);
});

// ── Global error handler ──────────────────────────────────────────
app.use(errorHandler);

export default app;
