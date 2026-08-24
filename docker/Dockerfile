# Build stage
FROM node:22-slim AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/web/package.json ./packages/web/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build packages
RUN npm run build

# Production stage
FROM node:22-slim AS production
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/server/dist ./server/dist
COPY --from=builder /app/packages/web/dist ./web/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create data directory
RUN mkdir -p /app/data

# Expose ports
EXPOSE 3001 3000

# Start server
CMD ["node", "packages/server/dist/index.js"]
