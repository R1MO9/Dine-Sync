import crypto from "crypto";

/**
 * Generates a unique, stable QR token for a table.
 * Token encodes restaurantId + tableNumber + a random salt.
 * Used as the unique identifier in the QR code URL.
 *
 * QR URL format: https://<subdomain>.tablescan.com/table/<qrToken>
 */
export const generateQrToken = (restaurantId, tableNumber) => {
    const salt = crypto.randomBytes(8).toString("hex");
    const payload = `${restaurantId}:${tableNumber}:${salt}`;
    return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 32);
};
