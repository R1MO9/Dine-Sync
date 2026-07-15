# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dine Sync is a QR-based smart restaurant ordering platform: a Node.js microservices monorepo
managed with npm workspaces. An API gateway is the single entry point; each backend concern
(auth, restaurant/tenant data, menu, orders, kitchen queue, ...) is its own Express service with
its own PostgreSQL database via Prisma.

## Commands

Install all workspace dependencies:

```bash
npm install
```

Run a service locally (with nodemon):

```bash
npm run dev:gateway        # api-gateway :8000
npm run dev:auth           # services/auth-service :8001
npm run dev:restaurant     # services/restaurant-service :8002
npm run dev:menu           # services/menu-service :8003
npm run dev:order          # services/order-service :8004
npm run dev:kitchen        # services/kitchen-queue-service :8005
npm run dev:payment        # services/payment-service :8006
npm run dev:inventory      # services/inventory-service :8007
npm run dev:notification   # services/notification-service :8008
```

All service ports (8001-8008) and Kafka (`kafka:9092` inside compose, `localhost:29092`
from the host) need to be reachable for the event-driven services (order, kitchen-queue,
payment, inventory, notification) to work — see `docker-compose.yml`, which now includes a
single-node KRaft-mode Kafka broker alongside the per-service Postgres containers.

Lint / test / format across all workspaces:

```bash
npm run lint          # eslint src/ per workspace (--if-present)
npm run test          # jest --runInBand --forceExit per workspace (--if-present)
npm run format        # prettier . --write
npm run format:check
```

Run lint/test for a single service directly (faster iteration):

```bash
npm run lint --workspace=services/menu-service
npm run test --workspace=services/menu-service
npx jest path/to/file.test.js --workspace=services/menu-service   # single test file
```

Prisma, per service that has a schema (auth, restaurant, menu, order, kitchen-queue,
payment, inventory, notification):

```bash
npm run db:generate --workspace=services/<name>-service
npm run db:migrate  --workspace=services/<name>-service
npm run db:studio   --workspace=services/<name>-service
```

Docker Compose (full stack incl. Postgres/Redis):

```bash
npm run build         # docker compose build
npm run up             # docker compose up -d
npm run down            # docker compose down
npm run down:clean       # docker compose down -v (drops volumes)
npm run logs             # docker compose logs -f
npm run logs:gateway      # docker compose logs -f api-gateway
```

Health checks once running: `GET /health` on the gateway (8000) and each service's own port.

Each service (and the gateway) requires its own `.env` — these are gitignored and not committed;
copy the shape documented in README.md's "Environment Variables" section when setting up locally.

## Architecture

```
Client / Admin UI / POS
        |
        v
API Gateway :8000
        |
        |-- /api/v1/auth              -> Auth Service :8001        -> auth_db
        |-- /api/v1/restaurants
        |-- /api/v1/tables            -> Restaurant Service :8002  -> restaurant_db
        |-- /api/v1/staff
        |-- /api/v1/menu(/public)     -> Menu Service :8003         -> menu_db
        |-- /api/v1/orders            -> Order Service :8004        -> order_db (+ Kafka)
        |-- /api/v1/queue             -> Kitchen Queue Svc :8005    -> kitchen_queue_db (+ Kafka)
        |-- /api/v1/payments|webhooks -> Payment Service :8006      -> payment_db (+ Kafka)
        |-- /api/v1/inventory         -> Inventory Service :8007    -> inventory_db (+ Kafka)
        `-- /api/v1/notifications     -> Notification Svc :8008     -> notification_db (+ Kafka, Socket.IO)
```

### Database-per-service

Every service owns an isolated Postgres database and Prisma schema (`services/<name>/prisma/schema.prisma`).
Cross-service references (e.g. `Restaurant.ownerId`, `Staff.userId` pointing at auth-service `User.id`)
are plain string IDs, not DB-level foreign keys — services never share a database or reach into each
other's tables directly.

### Gateway responsibilities (`api-gateway/src`)

- `config/routes.config.js` is the single source of truth for routing: each entry declares a path
  prefix, downstream target URL, whether auth is required, and which roles are allowed. Add new
  downstream routes here first.
- `plugins/proxy.js` builds the `http-proxy-middleware` instance used per route. On every proxied
  request it forwards `X-User-ID`, `X-User-Role`, `X-Restaurant-ID` (from the verified JWT / tenant
  middleware), plus `X-Tenant-Subdomain` and `X-Request-ID`. Proxy errors are translated to 502/504
  JSON responses rather than raw connection errors.
  `middlewares/auth.middleware.js` verifies the JWT at the gateway; `middlewares/tenant.middleware.js`
  resolves the tenant/restaurant context; `middlewares/rateLimiter.js` is Redis-backed and **fails
  open** (rate limiting is skipped, not enforced-closed, if Redis is unreachable).
- Downstream services trust `X-User-ID` / `X-User-Role` / `X-Restaurant-ID` headers when present
  (i.e. when called through the gateway) and fall back to verifying the JWT themselves when called
  directly — see `authenticate` in any service's `src/middlewares/auth.middleware.js`. This dual path
  is intentional so services remain independently testable/callable during development.

### Per-service internal structure

Every service (`auth-service`, `restaurant-service`, `menu-service`, `order-service`,
`kitchen-queue-service`, `payment-service`, `inventory-service`, `notification-service`)
follows the same layered layout under `src/`:

```
config/        env/config loader (config/index.js) + Prisma client wiring (config/db.js)
controllers/   thin HTTP handlers — parse req, call a service, format response
services/      business logic, Prisma queries
routes/        Express routers, wire validate() + authenticate/authorize + controller
validations/   Zod schemas, consumed by middlewares/validate.js
middlewares/   auth.middleware.js, validate.js (generic Zod validator), errorHandler.js
utils/         logger.js (Winston), response.js (sendSuccess/sendError helpers)
app.js         assembles the Express app: helmet, body parsing, /health, routes, 404, errorHandler
server.js      boots app.js, handles SIGTERM/SIGINT graceful shutdown (+ Prisma disconnect)
```

When adding a new endpoint, follow this same flow: validation schema -> route -> controller ->
service, and reuse `sendSuccess`/`sendError` from `utils/response.js` for the response envelope
(see "Response format" below) instead of hand-rolling JSON shapes.

### Soft deletes

Restaurant tables and staff rows are deactivated (`isActive: false`), never physically deleted.
Follow this convention for any new "removable" entity rather than issuing a hard `DELETE`.

### Event-driven services: Kafka

Every event-driven service has its own `src/kafka/{producer.js,consumer.js,topics.js}` (each
service defines its own local `topics.js` with the string names it needs — there's no shared
topics package, matching this repo's per-service-owns-its-contracts style). Event flow:

- **order-service** publishes `order.placed`, `order.approved`, `order.status_updated`,
  `order.completed` and consumes `payment.confirmed` (see `handlePaymentConfirmed`).
- **kitchen-queue-service** consumes order-service's topics to create/update `QueueTicket`
  rows (a kitchen-facing prep queue, decoupled from the customer-facing `Order` status) and
  publishes `kitchen.ticket_updated` when a chef advances a ticket.
- **payment-service** publishes `payment.confirmed` (`{ orderId, restaurantId }`) after its
  webhook verifies a payment — this is exactly the shape order-service's consumer expects.
- **inventory-service** consumes `order.approved` (not `order.placed`, so a cancelled-before-
  approval order never touches stock) to auto-decrement `StockItem` quantities.
- **notification-service** consumes all of the above plus `kitchen.ticket_updated`, persists a
  `Notification` row, and pushes it over Socket.IO to `restaurant:${restaurantId}` room clients.

Prefer publishing a new event over adding a synchronous cross-service HTTP call when a service
needs to react to something happening in another service.

### Internal (service-to-service) routes

A few endpoints exist only for other services to call, never end users — e.g. auth-service's
`GET /internal/user/:userId` and `PATCH /internal/user/:userId/restaurant`, and
restaurant-service's `GET /internal/tables/:id` (used by order-service to validate a table
without requiring customer-level auth). These are mounted on `/internal/*` (outside
`/api/v1`, so gateway routing never exposes them) and guarded by a shared-secret
`internalAuth.middleware.js` checking the `X-Internal-Api-Key` header against the
`INTERNAL_API_KEY` env var — every service's `.env` that calls one of these routes must have
the same value. When adding a new internal endpoint, follow this same pattern rather than
leaving it unauthenticated.

### Response format

All services use the same envelope via `utils/response.js` helpers:

```json
// success
{ "success": true, "message": "optional", "data": {} }
// error
{ "success": false, "code": "ERROR_CODE", "message": "human readable" }
```

`code` values are stable identifiers (e.g. `UNAUTHORIZED`, `TOKEN_EXPIRED`, `FORBIDDEN`,
`ROUTE_NOT_FOUND`, `EMAIL_TAKEN`, `SUBDOMAIN_TAKEN`, `TABLE_EXISTS`, `STAFF_EXISTS`,
`VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `BAD_GATEWAY`, `GATEWAY_TIMEOUT`) — reuse an existing
code where the situation matches instead of inventing a new one.

## Service implementation status

All eight services (`api-gateway`, `auth-service`, `restaurant-service`, `menu-service`,
`order-service`, `kitchen-queue-service`, `payment-service`, `inventory-service`,
`notification-service`) are implemented and routed through the gateway. `shared/` and `infra/`
workspace/directory placeholders exist but are currently empty.

Notes on the newer services:

- **payment-service** picks its payment provider via `PAYMENT_PROVIDER` (`mock` default |
  `razorpay`) through `src/providers/index.js` — see `src/providers/payment.provider.js` for the
  interface every provider implements. The `razorpay` provider is a real implementation but is
  untested without real `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`/`RAZORPAY_WEBHOOK_SECRET`
  credentials. Its webhook route (`/api/v1/webhooks/razorpay`) is mounted with `express.raw()`
  ahead of the app's global `express.json()` — signature verification needs the exact raw bytes.
- **notification-service** exposes a Socket.IO server (JWT passed via
  `socket.handshake.auth.token`, joins a `restaurant:${restaurantId}` room). The gateway proxies
  its WS upgrade too (`ws: true` on its `routes.config.js` entry, wired up in
  `api-gateway/server.js` via `wsProxies` exported from `app.js`) — a client can also connect
  directly to `NOTIFICATION_SERVICE_URL` as a fallback.
- **kitchen-queue-service**'s `QueueTicket` status is independent of order-service's `Order.status`
  — it's a separate kitchen-facing view kept in sync via Kafka, not a shared source of truth.

## Known inconsistency to be aware of

The gateway verifies access tokens using env var `JWT_SECRET`, while auth-service/restaurant-service
(and other services) use `JWT_ACCESS_SECRET`. For gateway-verified auth to work end-to-end, the
gateway's `.env` `JWT_SECRET` must be set to the same value as the issuing service's `JWT_ACCESS_SECRET`.
