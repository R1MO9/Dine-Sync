import { Router } from "express";
import { getTableById } from "../controllers/internal.controller.js";

const router = Router();

// GET /internal/tables/:id — used by order-service to validate a table
router.get("/tables/:id", getTableById);

export default router;
