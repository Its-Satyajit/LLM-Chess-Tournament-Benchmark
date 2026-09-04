# 03: Replay Game Review DB Cache & Uplink

**What to build:**
- Update `src/lib/queries.ts`:
  - Add query hook `useGameReviewQuery(gameId)` to fetch cached review from `/api/game/:gameId/review`.
  - Add mutation/helper `saveGameReviewToDb(gameId, review)` to save completed review to DB.
- Update `src/views/Replay.tsx`:
  - On page mount, check if cached review exists; if so, load it immediately into state without requiring a Web Worker run.
  - When user runs review (or worker finishes), uplink the completed review payload to `POST /api/game/:gameId/review`.
- Update `src/views/Replay.test.tsx`.

**Blocked by:** 02.

**Status:** done

- [x] `useGameReviewQuery` and `saveGameReviewToDb` added to `queries.ts`.
- [x] `Replay.tsx` loads cached review from DB and uplinks new reviews.
- [x] Replay tests pass.
