// Consumed — published by order-service, payment-service, kitchen-queue-service
export const TOPICS = {
    ORDER_PLACED: "order.placed",
    ORDER_APPROVED: "order.approved",
    ORDER_STATUS_UPDATED: "order.status_updated",
    ORDER_COMPLETED: "order.completed",
    PAYMENT_CONFIRMED: "payment.confirmed",
    KITCHEN_TICKET_UPDATED: "kitchen.ticket_updated",
};

// Which role(s) each event type is primarily relevant to (used for both the
// persisted Notification.targetRole and to decide what to tell the client).
export const TARGET_ROLE = {
    [TOPICS.ORDER_PLACED]: "floor_manager",
    [TOPICS.ORDER_APPROVED]: "chef",
    [TOPICS.ORDER_STATUS_UPDATED]: "floor_manager",
    [TOPICS.ORDER_COMPLETED]: "floor_manager",
    [TOPICS.PAYMENT_CONFIRMED]: "floor_manager",
    [TOPICS.KITCHEN_TICKET_UPDATED]: "floor_manager",
};
