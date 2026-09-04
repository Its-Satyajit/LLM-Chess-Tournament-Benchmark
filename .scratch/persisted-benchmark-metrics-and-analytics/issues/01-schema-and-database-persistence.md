# 01: Schema & Database Persistence for Game Reviews and Benchmark Metrics

**What to build:**
- Update `src/server/db/schema.ts`:
  - Add `gameReviews` table:
    - `id` (text PK), `gameId` (text FK games.id), `matchId` (text), `depth` (integer), `whiteAccuracy` (real), `blackAccuracy` (real), `whiteRating` (integer), `blackRating` (integer), `classificationCounts` (text JSON), `plies` (text JSON), `createdAt` (timestamp).
  - Add `metrics` text column to `matches` table.
- Update `src/server/db/index.ts` table initialization if necessary (CREATE TABLE IF NOT EXISTS / migrations).
- Update `src/server/services/database.ts`:
  - `saveGameReview(review)`
  - `getGameReview(gameId)`
  - `getBenchmarkMetrics()`
  - Persist match metrics snapshot when saving match.
- Add tests in `src/server/db/schema.test.ts` and `src/server/services/database.test.ts`.

**Blocked by:** None.

**Status:** resolved

- [x] `gameReviews` table added to `schema.ts`.
- [x] Database service methods implemented for game reviews and benchmark metrics.
- [x] Tests passing in `schema.test.ts` and `database.test.ts`.
