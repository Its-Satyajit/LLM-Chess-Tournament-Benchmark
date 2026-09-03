# ADR-020: Next.js App Router and Elysia Integration Migration

## Status

Accepted

## Date

2026-09-03

## Context

The repository previously operated a separate Vite-based React SPA (`packages/web`) and an ElysiaJS backend (`packages/server`), requiring dual dev servers and manual API fetch endpoints. We want to adopt Next.js App Router co-locating the Elysia backend via route handlers (`https://elysiajs.com/integrations/nextjs.md`) while maintaining end-to-end type safety via Eden Treaty and keeping real-time WebSocket capabilities.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS APPLICATION                      │
│                      (packages/web)                         │
├─────────────────────────────────────────────────────────────┤
│  App Router UI (app/)   │   Route Handlers (/api/[[...slugs]])
│  Server & Client React  │   Mounted Elysia router instance  │
│  Eden Treaty isomorphic │                                   │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │
                      Shared Engine & State
                               │
┌─────────────────────────────────────────────────────────────┐
│                  CUSTOM SERVER & WEBSOCKET                  │
│                    (packages/web/server.ts)                 │
├─────────────────────────────────────────────────────────────┤
│  Node http.createServer()                                   │
│  ├── HTTP: Next.js request handler                          │
│  └── Upgrade: Elysia WebSocket handler (/ws)                │
└─────────────────────────────────────────────────────────────┘
```

## Decision

1. **Migrate `packages/web` from Vite to Next.js (App Router)**:
   - Replace Vite configuration with Next.js App Router layout, pages, and components.
   - Mount the Elysia server routes inside `app/api/[[...slugs]]/route.ts` via `export const GET = app.fetch` and `export const POST = app.fetch`.
2. **End-to-End Type Safety with Eden Treaty**:
   - Create `lib/eden.ts` with isomorphic Eden Treaty client (`@elysia/eden`).
   - Preserve existing function signatures in `lib/api.ts` as a typed facade over Eden Treaty.
3. **Custom Node Server for Unified Port**:
   - Create `server.ts` running via `nub` that binds both Next.js request handling and the Elysia `/ws` WebSocket upgrade handler on a single port (`3000`).
4. **Testing and Tooling**:
   - Maintain Vitest test suite for both `packages/server` and `packages/web`.
   - Maintain unified scripts in root `package.json` (`dev`, `build`, `start`, `test`).

## Consequences

- Full Next.js SSR/App Router capabilities unlocked for UI pages and SEO.
- Zero boilerplate REST calls thanks to Elysia + Eden Treaty isomorphic integration.
- Single unified port (`3000`) for API, WebSockets, and UI.
- Preserved existing test coverage and modular monorepo packages.
