# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build packages
RUN bun run build

# Production stage
FROM oven/bun:1-slim AS production
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/server/dist ./server/dist
COPY --from=builder /app/packages/web/dist ./web/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose ports
EXPOSE 3001 3000

# Start server
CMD ["bun", "run", "packages/server/dist/index.js"]
