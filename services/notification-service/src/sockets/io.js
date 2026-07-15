import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import logger from "../utils/logger.js";

/**
 * Verifies the JWT passed in the Socket.IO handshake (socket.handshake.auth.token),
 * the same way auth.middleware.js's direct-JWT branch does for REST — there's no
 * gateway-header equivalent for a raw WS upgrade, so the client always sends its
 * access token explicitly here.
 */
const socketAuth = (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing access token"));

    try {
        socket.user = jwt.verify(token, config.jwt.accessSecret);
        next();
    } catch {
        next(new Error("Invalid or expired access token"));
    }
};

export const initSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: { origin: config.cors.origin, credentials: true },
    });

    io.use(socketAuth);

    io.on("connection", (socket) => {
        const { restaurantId, role, userId } = socket.user;
        if (restaurantId) socket.join(`restaurant:${restaurantId}`);
        logger.info("Socket connected", { userId, role, restaurantId });

        socket.on("disconnect", () => {
            logger.info("Socket disconnected", { userId, restaurantId });
        });
    });

    return io;
};
