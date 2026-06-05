import {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    getUserById,
    linkRestaurantToOwner,
} from "../services/auth.service.js";
import { sendSuccess, sendError } from "../utils/response.js";
import logger from "../utils/logger.js";

// helper at the top
const setTokenCookies = (res, accessToken, refreshToken) => {
    res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
};

// ── POST /api/v1/auth/register ────────────────────────────────────
export const register = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await registerUser(req.body);
        setTokenCookies(res, accessToken, refreshToken);
        logger.info("User registered", { userId: user.id, role: user.role });

        return sendSuccess(
            res,
            201,
            { user, accessToken, refreshToken },
            "Registration successful"
        );
    } catch (err) {
        next(err);
    }
};

// ── POST /api/v1/auth/login ───────────────────────────────────────
export const login = async (req, res, next) => {
    try {
        const { user, accessToken, refreshToken } = await loginUser(req.body);
        setTokenCookies(res, accessToken, refreshToken);
        logger.info("User logged in", { userId: user.id, role: user.role });

        return sendSuccess(res, 200, { user, accessToken, refreshToken }, "Login successful");
    } catch (err) {
        next(err);
    }
};

export const getByUserId = async (req, res, next) => {
    try {
        const user = await getUserById(req.params.userId);
        return sendSuccess(res, 200, { user });
    } catch (err) {
        next(err);
    }
};

export const linkOwnerRestaurant = async (req, res, next) => {
    try {
        const user = await linkRestaurantToOwner(req.params.userId, req.body.restaurantId);
        return sendSuccess(res, 200, { user }, "Restaurant linked to owner");
    } catch (err) {
        next(err);
    }
};

// ── POST /api/v1/auth/refresh ─────────────────────────────────────
export const refreshToken = async (req, res, next) => {
    try {
        // read from cookie first, fall back to body
        const token = req.cookies?.refreshToken || req.body.refreshToken;

        if (!token) {
            return sendError(res, 401, "UNAUTHORIZED", "Refresh token missing");
        }

        const { accessToken } = await refreshAccessToken(token);

        // Set new access token cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 15 * 60 * 1000,
        });

        return sendSuccess(res, 200, { accessToken }, "Token refreshed");
    } catch (err) {
        next(err);
    }
};

// ── POST /api/v1/auth/logout ──────────────────────────────────────
export const logout = async (req, res, next) => {
    try {
        await logoutUser(req.user.userId);
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return sendSuccess(res, 200, null, "Logged out successfully");
    } catch (err) {
        next(err);
    }
};

// ── GET /api/v1/auth/me ───────────────────────────────────────────
export const getMe = async (req, res, next) => {
    try {
        const user = await getUserById(req.user.userId);
        return sendSuccess(res, 200, { user });
    } catch (err) {
        next(err);
    }
};
