# 01: Next.js Package Setup & Elysia Route Handler Integration

**What to build:** Configure Next.js in `packages/web`, set up dependencies and TypeScript configuration, and mount the Elysia server routes inside Next.js Route Handler `app/api/[[...slugs]]/route.ts` exporting standard HTTP method handlers (`GET`, `POST`, etc.) according to the Elysia Next.js integration guide.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Next.js dependencies (`next`, `@sinclair/typebox`, `openapi-types`, `elysia`) added to `next-js-app`
- [x] Next.js configuration and tsconfig updated for Next.js App Router
- [x] Route handler at `app/api/[[...slugs]]/route.ts` mounts Elysia router and exports HTTP methods (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`)
- [x] Tests verify that the Elysia route handler responds correctly to `/api/health` and `/api/ratings`
