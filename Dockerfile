# ── Stage 1: Build ─────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/oricruit.db

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --omit=dev

# Copy server source and built frontend
COPY server.ts ./
COPY --from=builder /app/dist ./dist

# Data directory for SQLite — must be mounted as a volume
RUN mkdir -p /app/data
VOLUME ["/app/data"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "--experimental-strip-types", "server.ts"]
