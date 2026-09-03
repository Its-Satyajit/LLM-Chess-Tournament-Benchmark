# Spec: Migrate LLM Chess Arena to Next.js App Router with Elysia Integration

Status: ready-for-agent

## Problem Statement

Currently, the web client is a standalone Vite SPA running separately from the ElysiaJS backend server. This architecture forces running two separate development servers, requires maintaining manual string-based `fetch` endpoints in `packages/web/src/lib/api.ts`, misses out on Next.js Server Components / SSR capabilities, and complicates production deployment. The user wants to migrate the app to Next.js using the Elysia Next.js integration technique (`https://elysiajs.com/integrations/nextjs.md`) while keeping full real-time WebSocket and match engine support.

## Solution

Migrate `packages/web` from Vite to Next.js App Router (React 19). Co-locate the Elysia API server inside Next.js using `app/api/[[...slugs]]/route.ts` exporting `GET = app.fetch` and `POST = app.fetch`. Provide end-to-end type safety using Eden Treaty (`lib/eden.ts`) with a backward-compatible typed facade in `lib/api.ts`. Unify the HTTP and WebSocket servers into a custom Node server (`server.ts` powered by `nub`) on port 3000, serving Next.js pages, Elysia API routes, and `/ws` WebSocket connections on a single port.

## User Stories

1. As a developer, I want to start the full application (frontend, Elysia API, and WebSocket server) with a single command (`nub run dev`), so that my development workflow is seamless and fast.
2. As a developer, I want to call Elysia endpoints with full end-to-end type safety via Eden Treaty, so that breaking API changes are caught immediately at compile time.
3. As a developer, I want existing UI components and hooks (`useArenaMatch`, `Plaque`, `MatchConnectCard`, `Dashboard`, `Replay`) to remain functionally identical, so that no existing features regress.
4. As a spectator, I want to view the Arena console at `/`, so that I can monitor live games, clock updates, and LLM conversations in real-time over WebSockets.
5. As an LLM benchmark participant, I want to call `/api/match/create`, `/api/match/:id/move`, and `/api/match/:id/state` on the same Next.js host, so that match execution remains completely backward-compatible.
6. As an administrator, I want to create new matches and manage models at `/#admin`, so that I can configure benchmark tournaments effortlessly.
7. As a researcher, I want to view ratings and leaderboard statistics at `/#dashboard`, so that I can analyze LLM chess performance.
8. As a spectator, I want to replay past games at `/replay/[matchId]/[gameId]`, so that I can step through move history and analyze decisions.
9. As a developer, I want the test suite (`vitest`) and typechecker (`tsc`) to run cleanly in CI and locally, so that code quality and confidence remain high.

## Implementation Decisions

- **Framework & Directory Structure**:
  - Convert `packages/web` into a Next.js 15+ App Router application with React 19.
  - Remove Vite-specific configuration (`vite.config.ts`, `vite-env.d.ts`, `index.html`) in favor of `next.config.ts`, `tsconfig.json`, and Next.js App Router structure (`packages/web/app/`).
- **Elysia App Router Route Handler**:
  - Implement `packages/web/app/api/[[...slugs]]/route.ts` mounting Elysia route groups (match, tournament, ratings, admin, manifest, llms) with prefix `/api`.
  - Export `export const GET = app.fetch` and `export const POST = app.fetch` (as well as `PUT`, `DELETE`, `PATCH`, `OPTIONS` if needed).
  - Install peer dependencies `@sinclair/typebox` and `openapi-types` as required by Elysia in Next.js.
- **Eden Treaty Client**:
  - Implement `packages/web/lib/eden.ts` providing isomorphic `api` client using `typeof process !== 'undefined'` for direct server invocation and client network invocation.
  - Refactor `packages/web/lib/api.ts` to delegate to `eden`, preserving existing exported function signatures (`getMatch`, `createMatch`, `getGameState`, `getRatings`).
- **Unified Custom Node Server (`packages/web/server.ts`)**:
  - Use Node `http.createServer()` wrapping `next({ dev, dir })`.
  - Handle HTTP requests via Next.js request handler (`handle(req, res)`).
  - Handle HTTP `upgrade` requests by routing `/ws` to Elysia's WebSocket handler (`wsRoutes`).
  - Initialize the shared `database.loadMatches()` and match engine singleton.
- **Pages and Routing**:
  - `packages/web/app/layout.tsx`: Root HTML shell with navigation bar and custom stylesheet import.
  - `packages/web/app/page.tsx`: Console view embedding Arena, Admin, and Dashboard tabs/sections.
  - `packages/web/app/replay/[matchId]/[gameId]/page.tsx`: Move-by-move replay view.
- **Root Scripts**:
  - Update `package.json` root scripts:
    - `dev`: `nub run --filter @llm-chess-arena/web dev` (or `PORT=3000 nub packages/web/server.ts`)
    - `build`: `nub run build:server && nub run --filter @llm-chess-arena/web build`
    - `start`: `PORT=3000 nub packages/web/server.ts`
    - `test`: `cd packages/server && nubx vitest run && cd ../web && nubx vitest run`

## Testing Decisions

- **External Behavior Focus**: Tests will verify end-to-end API response payloads, Next.js page renders, and WebSocket subscription flows rather than private internal functions.
- **Seams**:
  1. *API Seam*: Next.js Route Handler `/api/[[...slugs]]/route.ts` tested via direct `app.handle(req)` or Eden Treaty calls.
  2. *Client Facade Seam*: `lib/api.ts` tested to ensure compatibility with `useArenaMatch` expectations.
  3. *UI Component Seam*: Vitest + `@testing-library/react` tests rendering `App`, `Console`, and `Arena` components.
  4. *WebSocket Seam*: Connection, subscribe, and broadcast verification.
- **Prior Art**: `packages/server/src/index.test.ts` and `packages/web/src/App.test.tsx`.

## Out of Scope

- Changing the chess engine (`chess.js`) or Drizzle ORM SQLite database schema.
- Redesigning the CSS styling or visual appearance of the chess boards.
- Modifying LLM prompt templates or benchmark evaluation algorithms.

## Further Notes

- Maintains compatibility with `nub` execution per repo conventions (`AGENTS.md`).
- Respects `ADR-020-nextjs-elysia-migration.md`.
