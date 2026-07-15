import { prisma } from "../config/db.js";
import { TARGET_ROLE } from "../kafka/topics.js";
import logger from "../utils/logger.js";

export const recordAndBroadcast = async (io, topic, payload) => {
    const { restaurantId } = payload;
    if (!restaurantId) {
        logger.warn("Kafka event missing restaurantId — skipping notification", { topic });
        return;
    }

    const notification = await prisma.notification.create({
        data: {
            restaurantId,
            targetRole: TARGET_ROLE[topic] || null,
            type: topic,
            payload,
        },
    });

    io.to(`restaurant:${restaurantId}`).emit("notification", {
        id: notification.id,
        type: notification.type,
        payload: notification.payload,
        createdAt: notification.createdAt,
    });

    logger.info("Notification recorded and broadcast", { notificationId: notification.id, topic });
};

export const getNotifications = async (restaurantId) => {
    return prisma.notification.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        take: 100,
    });
};

export const markAsRead = async (id, restaurantId) => {
    const notification = await prisma.notification.findFirst({ where: { id, restaurantId } });
    if (!notification) {
        const err = new Error("Notification not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
};
