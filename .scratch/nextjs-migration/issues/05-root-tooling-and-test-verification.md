# 05: Root Tooling, Build Scripts & Comprehensive Test Verification

**What to build:** Clean up obsolete Vite files in `packages/web`, update root `package.json` scripts (`dev`, `build`, `start`, `test`), and run the full test suite, linter, and typechecker to verify a clean build and zero regressions.

**Blocked by:** 04: Unified Custom Node Server & WebSocket Integration

**Status:** resolved

- [x] Obsolete Vite config files (`vite.config.ts`, `vite-env.d.ts`, `index.html`) removed or updated
- [x] Root `package.json` scripts updated for Next.js and custom server
- [x] `nub run build`, `nub run typecheck`, and `nub run test` all pass with zero errors
