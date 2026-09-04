# 02: API Endpoints for Benchmark Metrics and Game Reviews

**What to build:**
- Create `src/server/api/benchmark.ts`:
  - `GET /api/benchmark`: returns aggregated cross-model metrics matrix.
  - `GET /api/game/:gameId/review`: returns cached game review from DB.
  - `POST /api/game/:gameId/review`: persists deep Stockfish review to DB.
- Mount routes in `server.ts` and `src/app/api/[[...slugs]]/route.ts`.
- Add integration tests in `src/server/api/benchmark.test.ts`.

**Blocked by:** 01.

**Status:** resolved

- [x] `GET /api/benchmark` route implemented and returns cross-model benchmark data.
- [x] `GET /api/game/:gameId/review` and `POST /api/game/:gameId/review` routes implemented.
- [x] Integration tests pass in `src/server/api/benchmark.test.ts`.
