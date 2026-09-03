# 02: Isomorphic Eden Treaty Client & API Facade Migration

**What to build:** Implement the isomorphic Eden Treaty client (`lib/eden.ts`) using `@elysia/eden` typed against the Elysia app router. Refactor `lib/api.ts` into a typed facade delegating to Eden Treaty so that all UI hooks and components (`useArenaMatch`, `Dashboard`, `Replay`) seamlessly work with zero breaking changes to their contracts.

**Blocked by:** 01: Next.js Package Setup & Elysia Route Handler Integration

**Status:** resolved

- [x] `@elysia/eden` installed and `lib/eden.ts` created with isomorphic client handling both server-side and client-side execution
- [x] `lib/api.ts` refactored to delegate `getMatch`, `createMatch`, `getGameState`, and `getRatings` through Eden Treaty
- [x] Unit and integration tests verify `lib/api.ts` and `lib/eden.ts` behavior with mocked or live requests
