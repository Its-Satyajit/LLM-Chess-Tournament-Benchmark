# 04: Unified Custom Node Server & WebSocket Integration

**What to build:** Implement `packages/web/server.ts` to run Next.js with a Node HTTP server, intercepting WebSocket upgrade requests on `/ws` to attach Elysia's WebSocket handler and wire the shared match engine events. This allows Next.js pages, Elysia API endpoints, and live match WebSockets to run on a single unified port (3000).

**Blocked by:** 03: App Router Shell & Core Pages Migration

**Status:** resolved

- [x] `server.ts` implemented using `http.createServer()` and `next({ dev, dir })`
- [x] HTTP `upgrade` handling intercepts `/ws` and routes to Elysia's WebSocket broadcaster
- [x] Shared database and match engine singleton initialized on server startup
- [x] Integration test verifies WebSocket connection, subscription, and event broadcasts on the server
