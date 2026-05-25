import { Router } from "express";
import {
    register,
    login,
    logout,
    refreshToken,
    getMe,
    getByUserId,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { registerSchema, loginSchema, refreshTokenSchema } from "../validations/auth.schema.js";

const router = Router();

// ── Public routes ─────────────────────────────────────────────────

// POST /api/v1/auth/register
router.post("/register", validate(registerSchema), register);

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), login);

// POST /api/v1/auth/refresh
router.post("/refresh", validate(refreshTokenSchema), refreshToken);

// ── Protected routes ──────────────────────────────────────────────

// GET  /api/v1/auth/me
router.get("/me", authenticate, getMe);

// POST /api/v1/auth/logout
router.post("/logout", authenticate, logout);

// Internal route — called by other services only
router.get("/internal/user/:userId", getByUserId);

export default router;
