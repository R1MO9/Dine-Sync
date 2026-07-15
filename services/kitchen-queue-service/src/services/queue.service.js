import { prisma } from "../config/db.js";
import logger from "../utils/logger.js";
import { publishEvent } from "../kafka/producer.js";
import { TOPICS } from "../kafka/topics.js";

const validTransitions = {
    queued: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["served"],
    served: [],
    cancelled: [],
};

// ── Kafka handlers (order-service events) ─────────────────────────

export const createTicketFromOrder = async ({ orderId, restaurantId, tableNumber, items }) => {
    try {
        await prisma.queueTicket.create({
            data: { orderId, restaurantId, tableNumber, items: items || [] },
        });
        logger.info("Queue ticket created", { orderId, restaurantId });
    } catch (err) {
        if (err.code === "P2002") {
            logger.warn("Queue ticket already exists for order", { orderId });
            return;
        }
        throw err;
    }
};

export const cancelTicketByOrder = async (orderId) => {
    await prisma.queueTicket
        .update({ where: { orderId }, data: { status: "cancelled" } })
        .catch(() => logger.warn("No queue ticket to cancel", { orderId }));
};

export const completeTicketByOrder = async (orderId) => {
    await prisma.queueTicket
        .update({ where: { orderId }, data: { status: "served" } })
        .catch(() => logger.warn("No queue ticket to complete", { orderId }));
};

// ── REST-facing ────────────────────────────────────────────────────

export const getLiveTickets = async (restaurantId) => {
    return prisma.queueTicket.findMany({
        where: { restaurantId, status: { in: ["queued", "preparing", "ready"] } },
        orderBy: { receivedAt: "asc" },
    });
};

export const getTicketById = async (id, restaurantId) => {
    const ticket = await prisma.queueTicket.findFirst({ where: { id, restaurantId } });
    if (!ticket) {
        const err = new Error("Queue ticket not found");
        err.statusCode = 404;
        err.code = "NOT_FOUND";
        throw err;
    }
    return ticket;
};

export const updateTicketStatus = async (id, restaurantId, { status }) => {
    const ticket = await getTicketById(id, restaurantId);

    if (!validTransitions[ticket.status]?.includes(status)) {
        const err = new Error(`Cannot transition ticket from '${ticket.status}' to '${status}'`);
        err.statusCode = 400;
        err.code = "INVALID_STATUS_TRANSITION";
        throw err;
    }

    const updated = await prisma.queueTicket.update({ where: { id }, data: { status } });

    await publishEvent(
        TOPICS.TICKET_UPDATED,
        { ticketId: id, orderId: updated.orderId, restaurantId, status },
        restaurantId
    );

    logger.info("Queue ticket status updated", { ticketId: id, status });
    return updated;
};
