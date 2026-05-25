import { Router } from "express";
import {
    invite,
    getInviteDetails,
    accept,
    getAll,
    remove,
    getInvites,
    cancelInviteById,
} from "../controllers/staff.controller.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.js";
import { inviteStaffSchema, acceptInviteSchema } from "../validations/restaurant.schema.js";

const router = Router();

// ── Public (no auth) ──────────────────────────────────────────────

// GET  /api/v1/staff/accept-invite?token=xxx  — validate token, return invite details
router.get("/accept-invite", getInviteDetails);

// POST /api/v1/staff/accept-invite            — staff completes registration
router.post("/accept-invite", validate(acceptInviteSchema), accept);

// ── Protected (owner only) ────────────────────────────────────────
router.use(authenticate);

// POST   /api/v1/staff/invite        — owner sends invite email
router.post("/invite", authorize("owner"), validate(inviteStaffSchema), invite);

// GET    /api/v1/staff/invites       — owner views pending invites
router.get("/invites", authorize("owner"), getInvites);

// DELETE /api/v1/staff/invites/:id   — owner cancels invite
router.delete("/invites/:id", authorize("owner"), cancelInviteById);

// GET    /api/v1/staff               — owner views all active staff
router.get("/", authorize("owner"), getAll);

// DELETE /api/v1/staff/:id           — owner removes staff member
router.delete("/:id", authorize("owner"), remove);

export default router;
