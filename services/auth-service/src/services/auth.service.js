import bcrypt from "bcryptjs";
import { prisma } from "../config/db.js";
import config from "../config/index.js";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt.js";

// ── Register ──────────────────────────────────────────────────────
export const registerUser = async ({ name, email, password, role }) => {
    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        const err = new Error("Email is already registered");
        err.statusCode = 409;
        err.code = "EMAIL_TAKEN";
        throw err;
    }

    const hashed = await bcrypt.hash(password, config.bcrypt.saltRounds);

    const user = await prisma.user.create({
        data: { name, email, password: hashed, role },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const tokenPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Persist refresh token
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
    });

    return { user, accessToken, refreshToken };
};

// ── Login ─────────────────────────────────────────────────────────
export const loginUser = async ({ email, password }) => {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        err.code = "INVALID_CREDENTIALS";
        throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        const err = new Error("Invalid email or password");
        err.statusCode = 401;
        err.code = "INVALID_CREDENTIALS";
        throw err;
    }

    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Persist refresh token
    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
    });

    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
};

// ── Refresh Token ─────────────────────────────────────────────────
export const refreshAccessToken = async (token) => {
    // Verify token signature
    let decoded;
    try {
        decoded = verifyRefreshToken(token);
    } catch {
        const err = new Error("Invalid or expired refresh token");
        err.statusCode = 401;
        err.code = "INVALID_REFRESH_TOKEN";
        throw err;
    }

    // Check it exists in DB (not revoked)
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) {
        const err = new Error("Refresh token has been revoked or expired");
        err.statusCode = 401;
        err.code = "REFRESH_TOKEN_EXPIRED";
        throw err;
    }

    // Issue new access token
    const accessToken = generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        restaurantId: decoded.restaurantId,
    });

    return { accessToken };
};

// ── Logout ────────────────────────────────────────────────────────
export const logoutUser = async (userId) => {
    // Revoke all refresh tokens for this user (logout from all devices)
    await prisma.refreshToken.deleteMany({ where: { userId } });
};

// ── Get Me ────────────────────────────────────────────────────────
export const getUserById = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            restaurantId: true,
            createdAt: true,
        },
    });

    if (!user) {
        const err = new Error("User not found");
        err.statusCode = 404;
        err.code = "USER_NOT_FOUND";
        throw err;
    }

    return user;
};
