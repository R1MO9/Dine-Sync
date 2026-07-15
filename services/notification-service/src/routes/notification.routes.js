import { Router } from "express";
import { getAll, read } from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticate);

// GET   /api/v1/notifications          — recent notifications for my restaurant
router.get("/", getAll);

// PATCH /api/v1/notifications/:id/read — mark one as read
router.patch("/:id/read", read);

export default router;
