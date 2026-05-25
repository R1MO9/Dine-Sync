# Dine Sync

Dine Sync is a QR-based smart restaurant ordering platform built as a Node.js
microservices monorepo. The repository currently contains the API gateway,
authentication service, restaurant service, Docker orchestration, Prisma schemas,
and service-level routing/middleware foundations for the rest of the platform.

## Table of Contents

- [Project Overview](#project-overview)
- [Implemented Services](#implemented-services)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Docker Development](#docker-development)
- [Database and Prisma](#database-and-prisma)
- [Authentication and Authorization](#authentication-and-authorization)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Response Format](#response-format)
- [Logging and Errors](#logging-and-errors)
- [Operational Notes](#operational-notes)
- [Roadmap](#roadmap)

## Project Overview

Dine Sync lets restaurants manage tenants, staff, tables, and QR-code based table
entry points. The intended platform expands from these foundations into menu
management, ordering, kitchen queues, payments, inventory, and notifications.

Current core capabilities:

- Public user registration, login, token refresh, logout, and profile lookup.
- JWT-based authentication with role-based access control.
- API gateway routing to downstream services.
- Redis-backed gateway rate limiting.
- Restaurant creation and lookup.
- Table creation, listing, soft deletion, and QR token generation.
- Staff assignment, listing, and soft deletion.
- Service-specific PostgreSQL databases managed through Prisma.
- Docker Compose infrastructure for local orchestration.

## Implemented Services

| Service | Workspace | Port | Status | Responsibility |
| --- | --- | ---: | --- | --- |
| API Gateway | `api-gateway` | `8000` | Implemented | Single entry point, proxying, auth guard, tenant resolution, rate limiting |
| Auth Service | `services/auth-service` | `8001` | Implemented | Users, JWTs, refresh tokens, login/logout |
| Restaurant Service | `services/restaurant-service` | `8002` | Implemented | Restaurants, tables, staff, tenant data |
| Menu Service | `services/menu-service` | `8003` | Planned | Menu catalog and public menu scan routes |
| Order Service | `services/order-service` | `8004` | Planned | Customer orders and order lifecycle |
| Kitchen Queue Service | `services/kitchen-queue-service` | `8005` | Planned | Kitchen preparation queue |
| Payment Service | `services/payment-service` | `8006` | Planned | Payments and webhooks |
| Inventory Service | `services/inventory-service` | `8007` | Planned | Stock tracking |
| Notification Service | `services/notification-service` | `8008` | Planned | Notifications and WebSocket events |

The gateway has route configuration entries for the planned services, but those
service directories are not present yet.

## Architecture

```text
Client / Admin UI / POS
        |
        v
API Gateway :8000
        |
        |-- /api/v1/auth        -> Auth Service :8001 -> auth_db
        |-- /api/v1/restaurants -> Restaurant Service :8002 -> restaurant_db
        |-- /api/v1/tables      -> Restaurant Service :8002 -> restaurant_db
        |-- /api/v1/staff       -> Restaurant Service :8002 -> restaurant_db
        |
        `-- planned routes      -> menu/order/kitchen/payment/inventory/notification

Redis :6379 is used by the gateway for rate limiting.
```

Key design choices:

- Database-per-service: auth and restaurant data live in separate Postgres
  databases.
- Gateway-first access: external clients should call the API gateway. Services
  can also be called directly during development.
- JWT propagation: the gateway validates JWTs and forwards user context to
  downstream services with `X-User-ID`, `X-User-Role`, and `X-Restaurant-ID`.
- Soft deletes: restaurant tables and staff records are deactivated with
  `isActive: false` rather than physically deleted.

## Repository Structure

```text
.
|-- api-gateway/
|   |-- server.js
|   |-- Dockerfile
|   `-- src/
|       |-- app.js
|       |-- config.js
|       |-- config/
|       |   `-- routes.config.js
|       |-- middlewares/
|       |-- plugins/
|       `-- utils/
|-- services/
|   |-- auth-service/
|   |   |-- server.js
|   |   |-- Dockerfile
|   |   |-- prisma/
|   |   `-- src/
|   |       |-- app.js
|   |       |-- config/
|   |       |-- controllers/
|   |       |-- middlewares/
|   |       |-- routes/
|   |       |-- services/
|   |       |-- utils/
|   |       `-- validations/
|   `-- restaurant-service/
|       |-- server.js
|       |-- Dockerfile
|       |-- prisma/
|       `-- src/
|           |-- app.js
|           |-- config/
|           |-- controllers/
|           |-- middlewares/
|           |-- routes/
|           |-- services/
|           |-- utils/
|           `-- validations/
|-- docker-compose.yml
|-- package.json
|-- package-lock.json
`-- README.md
```

## Technology Stack

- Runtime: Node.js 20+
- Package manager: npm workspaces
- Framework: Express
- Database: PostgreSQL 16
- ORM: Prisma
- Cache/rate limiting: Redis 7
- Authentication: JSON Web Tokens with `jsonwebtoken`
- Password hashing: `bcryptjs`
- Validation: Zod
- Logging: Winston
- Security middleware: Helmet, CORS, HTTP-only cookies
- Containerization: Docker and Docker Compose

## Prerequisites

- Node.js `>=20.0.0`
- npm `>=10.0.0`
- Docker and Docker Compose
- PostgreSQL and Redis if running services outside Docker

## Environment Variables

The Compose file expects service-level `.env` files:

- `api-gateway/.env`
- `services/auth-service/.env`
- `services/restaurant-service/.env`

These files are not committed in the repository, so create them locally.

### API Gateway

```env
PORT=8000
NODE_ENV=development
JWT_SECRET=replace-with-the-same-access-secret-used-by-auth-service
JWT_ACCESS_EXPIRY=15m

REDIS_HOST=localhost
REDIS_PORT=6379

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_GLOBAL=200
RATE_LIMIT_MAX_TENANT=100

CORS_ORIGIN=http://localhost:3000,http://localhost:5173
PROXY_TIMEOUT_MS=10000

AUTH_SERVICE_URL=http://localhost:8001
RESTAURANT_SERVICE_URL=http://localhost:8002
MENU_SERVICE_URL=http://localhost:8003
ORDER_SERVICE_URL=http://localhost:8004
KITCHEN_SERVICE_URL=http://localhost:8005
PAYMENT_SERVICE_URL=http://localhost:8006
INVENTORY_SERVICE_URL=http://localhost:8007
NOTIFICATION_SERVICE_URL=http://localhost:8008
```

### Auth Service

```env
PORT=8001
NODE_ENV=development
DATABASE_URL=postgresql://dinesync:secret@localhost:5432/auth_db

JWT_ACCESS_SECRET=replace-with-a-strong-secret
JWT_REFRESH_SECRET=replace-with-a-different-strong-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

BCRYPT_SALT_ROUNDS=12
```

### Restaurant Service

```env
PORT=8002
NODE_ENV=development
DATABASE_URL=postgresql://dinesync:secret@localhost:5433/restaurant_db

JWT_ACCESS_SECRET=replace-with-the-auth-access-secret

AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
```

Important: the gateway currently verifies access tokens with `JWT_SECRET`, while
the auth and restaurant services use `JWT_ACCESS_SECRET`. For gateway-based
authentication to work, set `api-gateway/.env` `JWT_SECRET` to the same value as
`JWT_ACCESS_SECRET`.

## Local Development

Install dependencies for all npm workspaces:

```bash
npm install
```

Run individual services:

```bash
npm run dev:gateway
npm run dev:auth
npm run dev:restaurant
```

Useful root scripts:

| Command | Description |
| --- | --- |
| `npm run dev:gateway` | Start API gateway with nodemon |
| `npm run dev:auth` | Start auth service with nodemon |
| `npm run dev:restaurant` | Start restaurant service with nodemon |
| `npm run lint` | Run workspace lint scripts if present |
| `npm run test` | Run workspace test scripts if present |
| `npm run format` | Format the repository with Prettier |
| `npm run format:check` | Check Prettier formatting |

Service-level Prisma scripts:

```bash
npm run db:generate --workspace=services/auth-service
npm run db:migrate --workspace=services/auth-service
npm run db:studio --workspace=services/auth-service

npm run db:generate --workspace=services/restaurant-service
npm run db:migrate --workspace=services/restaurant-service
npm run db:studio --workspace=services/restaurant-service
```

## Docker Development

Build images:

```bash
npm run build
```

Start the platform:

```bash
npm run up
```

Stop containers:

```bash
npm run down
```

Stop containers and remove volumes:

```bash
npm run down:clean
```

View logs:

```bash
npm run logs
npm run logs:gateway
```

Docker Compose services:

| Container | Public Port | Internal Port | Purpose |
| --- | ---: | ---: | --- |
| `ds-api-gateway` | `8000` | `8000` | API gateway |
| `ds-auth-service` | `8001` | `8001` | Auth service |
| `ds-restaurant-service` | `8002` | `8002` | Restaurant service |
| `ds-postgres-auth` | `5432` | `5432` | Auth database |
| `ds-postgres-restaurant` | `5433` | `5432` | Restaurant database |
| `ds-redis` | `6379` | `6379` | Redis cache |

Health checks:

```bash
curl http://localhost:8000/health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

## Database and Prisma

Each implemented service owns its own Prisma schema and migrations.

### Auth Database

Location: `services/auth-service/prisma/schema.prisma`

Models:

- `User`
- `RefreshToken`

Enums:

- `Role`: `owner`, `floor_manager`, `chef`, `customer`

### Restaurant Database

Location: `services/restaurant-service/prisma/schema.prisma`

Models:

- `Restaurant`
- `Table`
- `Staff`

Enums:

- `SubscriptionPlan`: `free`, `starter`, `growth`, `enterprise`
- `StaffRole`: `owner`, `floor_manager`, `chef`

Cross-service references such as `Restaurant.ownerId` and `Staff.userId` point to
auth-service users by ID, but they are not database-level foreign keys because
the services use separate databases.

## Authentication and Authorization

Authentication flow:

1. A user registers or logs in through `POST /api/v1/auth/register` or
   `POST /api/v1/auth/login`.
2. The auth service returns an access token and refresh token.
3. It also sets HTTP-only `accessToken` and `refreshToken` cookies.
4. Gateway-protected routes expect `Authorization: Bearer <accessToken>`.
5. The gateway verifies the token and forwards user context to downstream
   services.

Roles:

| Role | Description |
| --- | --- |
| `owner` | Restaurant owner and primary admin |
| `floor_manager` | Restaurant floor operations user |
| `chef` | Kitchen user |
| `customer` | End customer |

Gateway-level route permissions:

| Prefix | Auth Required | Roles |
| --- | --- | --- |
| `/api/v1/auth` | No | Public |
| `/api/v1/restaurants` | Yes | `owner` |
| `/api/v1/tables` | Yes | `owner`, `floor_manager` |
| `/api/v1/staff` | Yes | `owner` |
| `/api/v1/menu/public` | No | Public |
| `/api/v1/menu` | Yes | `owner`, `floor_manager` |
| `/api/v1/orders` | Yes | Any authenticated user |
| `/api/v1/queue` | Yes | `chef`, `floor_manager` |
| `/api/v1/payments` | Yes | Any authenticated user |
| `/api/v1/webhooks` | No | Public |
| `/api/v1/inventory` | Yes | `owner`, `floor_manager` |
| `/api/v1/notifications` | Yes | Any authenticated user |

## API Reference

All implemented APIs are available through the gateway at
`http://localhost:8000`. Services can also be called directly on their own ports
for development.

### Health

#### `GET /health`

Checks API gateway health.

Direct service health checks:

- `GET http://localhost:8001/health`
- `GET http://localhost:8002/health`

### Auth Service

#### `POST /api/v1/auth/register`

Creates a user and returns tokens.

Request body:

```json
{
  "name": "Restaurant Owner",
  "email": "owner@example.com",
  "password": "password123",
  "role": "owner"
}
```

Validation:

- `name`: 2 to 64 characters
- `email`: valid email
- `password`: 8 to 64 characters
- `role`: `owner`, `floor_manager`, `chef`, or `customer`; defaults to
  `customer`

#### `POST /api/v1/auth/login`

Authenticates a user.

Request body:

```json
{
  "email": "owner@example.com",
  "password": "password123"
}
```

#### `POST /api/v1/auth/refresh`

Issues a new access token. The refresh token can come from the HTTP-only cookie
or the request body.

Request body:

```json
{
  "refreshToken": "refresh-token-value"
}
```

#### `GET /api/v1/auth/me`

Returns the authenticated user.

Headers:

```http
Authorization: Bearer <accessToken>
```

#### `POST /api/v1/auth/logout`

Deletes stored refresh tokens for the authenticated user and clears auth cookies.

Headers:

```http
Authorization: Bearer <accessToken>
```

### Restaurant Service

#### `POST /api/v1/restaurants`

Creates a restaurant for the authenticated owner.

Headers:

```http
Authorization: Bearer <ownerAccessToken>
```

Request body:

```json
{
  "name": "TableScan Cafe",
  "subdomain": "tablescan-cafe",
  "address": "12 Park Street",
  "phone": "+911234567890"
}
```

Validation:

- `name`: 2 to 100 characters
- `subdomain`: 3 to 50 characters, lowercase letters, numbers, and hyphens
- `address`: optional, up to 255 characters
- `phone`: optional, up to 20 characters

#### `GET /api/v1/restaurants/me`

Returns the authenticated owner's active restaurant with tables and staff.

Headers:

```http
Authorization: Bearer <ownerAccessToken>
```

#### `GET /api/v1/restaurants/:id`

Returns a restaurant by ID with tables and staff.

Headers:

```http
Authorization: Bearer <accessToken>
```

#### `PATCH /api/v1/restaurants/:id`

Updates a restaurant owned by the authenticated owner.

Headers:

```http
Authorization: Bearer <ownerAccessToken>
```

Request body:

```json
{
  "name": "Updated Cafe Name",
  "address": "New address",
  "phone": "+919999999999"
}
```

### Table APIs

Table APIs require `restaurantId` in the authenticated token or an
`X-Restaurant-ID` tenant header forwarded through the gateway.

#### `POST /api/v1/tables`

Creates a table and generates a unique QR token.

Headers:

```http
Authorization: Bearer <ownerAccessToken>
X-Restaurant-ID: <restaurantId>
```

Request body:

```json
{
  "number": 1,
  "label": "Window Seat"
}
```

Validation:

- `number`: positive integer
- `label`: optional, up to 50 characters

#### `GET /api/v1/tables`

Lists active tables for the restaurant.

Headers:

```http
Authorization: Bearer <ownerOrFloorManagerAccessToken>
X-Restaurant-ID: <restaurantId>
```

#### `DELETE /api/v1/tables/:id`

Soft deletes a table by setting `isActive` to `false`.

Headers:

```http
Authorization: Bearer <ownerAccessToken>
X-Restaurant-ID: <restaurantId>
```

### Staff APIs

Staff APIs require `restaurantId` in the authenticated token or an
`X-Restaurant-ID` tenant header forwarded through the gateway.

#### `POST /api/v1/staff`

Adds an auth-service user as restaurant staff.

Headers:

```http
Authorization: Bearer <ownerAccessToken>
X-Restaurant-ID: <restaurantId>
```

Request body:

```json
{
  "userId": "auth-user-uuid",
  "role": "floor_manager"
}
```

Validation:

- `userId`: UUID
- `role`: `floor_manager` or `chef`

#### `GET /api/v1/staff`

Lists active staff for the restaurant.

Headers:

```http
Authorization: Bearer <ownerAccessToken>
X-Restaurant-ID: <restaurantId>
```

#### `DELETE /api/v1/staff/:id`

Soft deletes a staff membership by setting `isActive` to `false`.

Headers:

```http
Authorization: Bearer <ownerAccessToken>
X-Restaurant-ID: <restaurantId>
```

## Data Models

### User

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | UUID primary key |
| `name` | `String` | User display name |
| `email` | `String` | Unique email |
| `password` | `String` | Hashed password |
| `role` | `Role` | Defaults to `customer` |
| `restaurantId` | `String?` | Optional restaurant context |
| `isActive` | `Boolean` | Defaults to `true` |
| `createdAt` | `DateTime` | Created timestamp |
| `updatedAt` | `DateTime` | Updated timestamp |

### RefreshToken

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | UUID primary key |
| `token` | `String` | Unique refresh token |
| `userId` | `String` | Auth user ID |
| `expiresAt` | `DateTime` | Expiration timestamp |
| `createdAt` | `DateTime` | Created timestamp |

### Restaurant

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | UUID primary key |
| `name` | `String` | Restaurant name |
| `subdomain` | `String` | Unique tenant subdomain |
| `ownerId` | `String` | Auth-service user ID |
| `address` | `String?` | Optional address |
| `phone` | `String?` | Optional phone |
| `logoUrl` | `String?` | Optional logo URL |
| `plan` | `SubscriptionPlan` | Defaults to `free` |
| `isActive` | `Boolean` | Defaults to `true` |
| `createdAt` | `DateTime` | Created timestamp |
| `updatedAt` | `DateTime` | Updated timestamp |

### Table

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | UUID primary key |
| `restaurantId` | `String` | Restaurant ID |
| `number` | `Int` | Table number |
| `label` | `String?` | Optional table label |
| `qrCodeUrl` | `String?` | Placeholder for generated QR image URL |
| `qrToken` | `String` | Unique token encoded in QR |
| `isActive` | `Boolean` | Defaults to `true` |
| `createdAt` | `DateTime` | Created timestamp |
| `updatedAt` | `DateTime` | Updated timestamp |

Constraint: each restaurant can only have one active or inactive table row for a
given `number` because of the unique `(restaurantId, number)` index.

### Staff

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | UUID primary key |
| `restaurantId` | `String` | Restaurant ID |
| `userId` | `String` | Auth-service user ID |
| `role` | `StaffRole` | `owner`, `floor_manager`, or `chef` |
| `isActive` | `Boolean` | Defaults to `true` |
| `createdAt` | `DateTime` | Created timestamp |
| `updatedAt` | `DateTime` | Updated timestamp |

Constraint: each restaurant can only have one staff row for a given `userId`.

## Response Format

The services use response helpers from `src/utils/response.js`. Successful
responses follow this shape:

```json
{
  "success": true,
  "message": "Optional success message",
  "data": {}
}
```

Error responses follow this shape:

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

Common error codes include:

| Code | Meaning |
| --- | --- |
| `UNAUTHORIZED` | Missing auth credentials |
| `INVALID_TOKEN` | JWT validation failed |
| `TOKEN_EXPIRED` | Access token expired |
| `FORBIDDEN` | Role is not allowed |
| `ROUTE_NOT_FOUND` | Route does not exist |
| `EMAIL_TAKEN` | Email is already registered |
| `INVALID_CREDENTIALS` | Login failed |
| `INVALID_REFRESH_TOKEN` | Refresh token is invalid |
| `REFRESH_TOKEN_EXPIRED` | Refresh token expired or revoked |
| `SUBDOMAIN_TAKEN` | Restaurant subdomain already exists |
| `TABLE_EXISTS` | Table number already exists for restaurant |
| `STAFF_EXISTS` | User is already staff for restaurant |
| `RATE_LIMIT_EXCEEDED` | Global gateway rate limit exceeded |
| `TENANT_RATE_LIMIT_EXCEEDED` | Tenant gateway rate limit exceeded |
| `BAD_GATEWAY` | Downstream service proxy error |
| `GATEWAY_TIMEOUT` | Downstream service timeout |

## Logging and Errors

- Each service uses Winston logger utilities.
- Each service has a final Express error handler.
- Servers listen for `SIGTERM` and `SIGINT` and attempt graceful shutdown.
- Auth and restaurant services disconnect Prisma during graceful shutdown.
- Gateway proxy errors are converted to `502` or `504` responses.
- Redis rate limiter fails open if Redis is unavailable, so traffic is not
  blocked by cache downtime.

## Operational Notes

- Run database migrations before depending on a fresh database.
- The Dockerfiles generate Prisma clients during image builds for services that
  use Prisma.
- The auth service stores refresh tokens in the database. Logout deletes all
  refresh tokens for that user.
- Restaurant staff records do not currently update the corresponding auth user
  role or `restaurantId`; that linkage must be managed by a future integration
  flow or admin operation.
- `qrCodeUrl` exists in the table model, but the current implementation only
  generates a `qrToken`.
- Planned gateway routes will return proxy errors until their downstream
  services are implemented and running.

## Roadmap

Recommended next steps:

1. Add committed `.env.example` files for each service.
2. Align gateway `JWT_SECRET` naming with auth-service `JWT_ACCESS_SECRET`.
3. Add tests for auth flows, gateway auth/role forwarding, and restaurant CRUD.
4. Implement user-to-restaurant assignment when owners create restaurants and
   when staff are added.
5. Add menu, order, kitchen queue, payment, inventory, and notification services.
6. Generate QR images and persist `qrCodeUrl`.
7. Add OpenAPI documentation once API contracts stabilize.
