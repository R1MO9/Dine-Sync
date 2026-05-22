FROM node:20-alpine AS base
WORKDIR /app

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

COPY --from=prisma-gen /app/node_modules ./node_modules
COPY --from=prisma-gen /app/prisma       ./prisma
COPY . .

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8001/health || exit 1

CMD ["node", "server.js"]