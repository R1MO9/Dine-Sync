// Consumed — published by order-service
export const ORDER_TOPICS = {
    ORDER_PLACED: "order.placed",
    ORDER_APPROVED: "order.approved",
    ORDER_STATUS_UPDATED: "order.status_updated",
    ORDER_COMPLETED: "order.completed",
};

// Published — consumed by notification-service
export const TOPICS = {
    TICKET_UPDATED: "kitchen.ticket_updated",
};
