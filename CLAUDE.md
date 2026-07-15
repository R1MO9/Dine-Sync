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
npm run dev:kitchen        # services/kitchen-queue-service :8005 (scaffold only, see below)
```

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

Prisma, per service that has a schema (auth, restaurant, menu, order, kitchen-queue):

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
        |-- /api/v1/queue             -> Kitchen Queue Service :8005 (scaffold, not yet routed)
        `-- /api/v1/payments|inventory|notifications -> not yet implemented
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

Every implemented service (`auth-service`, `restaurant-service`, `menu-service`, `order-service`)
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

### Order service: Kafka

`services/order-service/src/kafka/` defines `producer.js`, `consumer.js`, and `topics.js`
(`order.placed`, `order.approved`, `order.status_updated`, `order.completed`, `payment.confirmed`).
Order lifecycle changes are expected to be published as events for other services (kitchen queue,
notifications) to consume, rather than services calling each other synchronously.

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

- **Implemented and routed through the gateway**: `api-gateway`, `auth-service`, `restaurant-service`,
  `menu-service`, `order-service`.
- **Scaffolded but not yet built out**: `kitchen-queue-service` currently only has `app.js` and
  `config/` — no controllers/routes/services yet, and it is not yet wired into
  `api-gateway/src/config/routes.config.js`'s target resolution beyond the `KITCHEN_SERVICE_URL` env var.
- **Not started**: payment, inventory, notification services. Gateway routes for these paths exist in
  `routes.config.js` but will proxy-error (502/504) until the services exist.
- `shared/` and `infra/` workspace/directory placeholders exist but are currently empty.

## Known inconsistency to be aware of

The gateway verifies access tokens using env var `JWT_SECRET`, while auth-service/restaurant-service
(and other services) use `JWT_ACCESS_SECRET`. For gateway-verified auth to work end-to-end, the
gateway's `.env` `JWT_SECRET` must be set to the same value as the issuing service's `JWT_ACCESS_SECRET`.
