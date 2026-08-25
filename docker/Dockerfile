# Build stage: install workspace deps and build the web UI
FROM node:22-bookworm AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/

RUN corepack enable && corepack prepare pnpm@11.23.0 --activate \
 && pnpm install --frozen-lockfile

# Runtime stage
FROM node:22-bookworm-slim AS production
WORKDIR /app

# Server entrypoints are TypeScript source, executed with nub (project runtime)
RUN npm i -g nub@0.7.5

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nub.config.yaml ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server

RUN mkdir -p /app/data

ENV NODE_ENV=production
EXPOSE 3001

CMD ["nub", "packages/server/src/index.ts"]
