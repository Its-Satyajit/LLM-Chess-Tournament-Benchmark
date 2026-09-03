# 03: App Router Shell & Core Pages Migration

**What to build:** Migrate the existing React Router frontend pages to Next.js App Router. Create root `app/layout.tsx` (with navigation header and styling) and pages (`app/page.tsx` for Console/Arena/Dashboard/Admin, and `app/replay/[matchId]/[gameId]/page.tsx` for game replay), ensuring all interactive components, stores, hooks, and CSS operate seamlessly.

**Blocked by:** 02: Isomorphic Eden Treaty Client & API Facade Migration

**Status:** resolved

- [x] `app/layout.tsx` created rendering global navigation and importing stylesheets
- [x] `app/page.tsx` created mounting the unified Arena/Console view
- [x] `app/replay/[matchId]/[gameId]/page.tsx` created mounting the Replay view with dynamic route params
- [x] `react-router-dom` usage replaced with Next.js navigation primitives (`next/link`, `next/navigation`)
- [x] Vitest component tests pass verifying page rendering and interaction
