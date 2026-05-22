const SERVICES = {
    AUTH: process.env.AUTH_SERVICE_URL || "http://localhost:8001",
    RESTAURANT: process.env.RESTAURANT_SERVICE_URL || "http://localhost:8002",
    MENU: process.env.MENU_SERVICE_URL || "http://localhost:8003",
    ORDER: process.env.ORDER_SERVICE_URL || "http://localhost:8004",
    KITCHEN: process.env.KITCHEN_SERVICE_URL || "http://localhost:8005",
    PAYMENT: process.env.PAYMENT_SERVICE_URL || "http://localhost:8006",
    INVENTORY: process.env.INVENTORY_SERVICE_URL || "http://localhost:8007",
    NOTIFICATION: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8008",
};

/**
 * Route config:
 *   path     — incoming prefix to match
 *   target   — downstream service base URL
 *   auth     — require JWT validation?
 *   roles    — allowed roles (empty = any authenticated user)
 */
const ROUTES = [
    // ── Auth (public) ──────────────────────────────────────────────
    { path: "/api/v1/auth", target: SERVICES.AUTH, auth: false },

    // ── Restaurant / Tenant ────────────────────────────────────────
    { path: "/api/v1/restaurants", target: SERVICES.RESTAURANT, auth: true, roles: ["owner"] },
    {
        path: "/api/v1/tables",
        target: SERVICES.RESTAURANT,
        auth: true,
        roles: ["owner", "floor_manager"],
    },
    { path: "/api/v1/staff", target: SERVICES.RESTAURANT, auth: true, roles: ["owner"] },

    // ── Menu (public scan route + protected management) ───────────
    { path: "/api/v1/menu/public", target: SERVICES.MENU, auth: false },
    { path: "/api/v1/menu", target: SERVICES.MENU, auth: true, roles: ["owner", "floor_manager"] },

    // ── Orders ────────────────────────────────────────────────────
    { path: "/api/v1/orders", target: SERVICES.ORDER, auth: true, roles: [] },

    // ── Kitchen Queue ─────────────────────────────────────────────
    {
        path: "/api/v1/queue",
        target: SERVICES.KITCHEN,
        auth: true,
        roles: ["chef", "floor_manager"],
    },

    // ── Payments ──────────────────────────────────────────────────
    { path: "/api/v1/payments", target: SERVICES.PAYMENT, auth: true, roles: [] },
    { path: "/api/v1/webhooks", target: SERVICES.PAYMENT, auth: false }, // Razorpay hits this directly

    // ── Inventory ─────────────────────────────────────────────────
    {
        path: "/api/v1/inventory",
        target: SERVICES.INVENTORY,
        auth: true,
        roles: ["owner", "floor_manager"],
    },

    // ── Notifications (WebSocket handled by notification service) ─
    { path: "/api/v1/notifications", target: SERVICES.NOTIFICATION, auth: true, roles: [] },
];

export default ROUTES;
