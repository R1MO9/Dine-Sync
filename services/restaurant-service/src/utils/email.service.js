import nodemailer from "nodemailer";
import config from "../config/index.js";
import logger from "./logger.js";

const transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
        user: config.email.user,
        pass: config.email.pass,
    },
});

// ── Send Staff Invite Email ───────────────────────────────────────
export const sendInviteEmail = async ({ to, restaurantName, role, inviteUrl }) => {
    const roleLabel = role === "floor_manager" ? "Floor Manager" : "Chef";

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1A73E8;">You're invited to join ${restaurantName}!</h2>
      <p>You have been invited as a <strong>${roleLabel}</strong> at <strong>${restaurantName}</strong> on DineSync.</p>
      <p>Click the button below to set up your account. This invite expires in <strong>48 hours</strong>.</p>
      <a href="${inviteUrl}"
         style="display:inline-block;padding:12px 24px;background:#1A73E8;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Accept Invite
      </a>
      <p style="color:#888;font-size:12px;">If you didn't expect this invite, you can safely ignore this email.</p>
      <p style="color:#888;font-size:12px;">Or copy this link: ${inviteUrl}</p>
    </div>
  `;

    try {
        await transporter.sendMail({
            from: `"DineSync" <${config.email.from}>`,
            to,
            subject: `You're invited to join ${restaurantName} on DineSync`,
            html,
        });
        logger.info("Invite email sent", { to });
    } catch (err) {
        logger.error("Failed to send invite email", { to, message: err.message });
        throw err;
    }
};
