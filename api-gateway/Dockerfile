FROM node:20-alpine AS base
WORKDIR /app

# ── Install dependencies ──────────────────────────────
FROM base AS deps
COPY package.json ./
RUN npm install --omit=dev

# ── Production image ──────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

CMD ["node", "server.js"]
