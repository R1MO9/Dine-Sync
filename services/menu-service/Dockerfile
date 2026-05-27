FROM node:20-alpine AS base
WORKDIR /app

# ── Fix: install OpenSSL for Prisma on Alpine ─────────
RUN apk add --no-cache openssl

# ── Install dependencies ──────────────────────────────
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

# ── Generate Prisma client ────────────────────────────
FROM deps AS prisma-gen
COPY prisma ./prisma
RUN npx prisma generate

# ── Production image ──────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=prisma-gen /app/node_modules ./node_modules
COPY --from=prisma-gen /app/prisma       ./prisma
COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8003

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8003/health || exit 1

CMD ["node", "server.js"]