# 01: Non-Forfeiting API Rate Limits

**What to build:**
- Update `MatchEngine.ts`:
  - In `makeMove`, if `game.apiCallsThisGame[color] >= LIMITS.MAX_API_CALLS_PER_GAME`, log the error and return `{ accepted: false, error: 'API_LIMIT' }` without forfeiting or completing the game.
  - In `trackApiCall`, if `game.apiCallsThisGame[color] > LIMITS.MAX_API_CALLS_PER_GAME`, log the error and return `false` without forfeiting or completing the game.
- Update `src/server/api/match.ts`:
  - In `gate()`, when `!engine.trackApiCall(...)`, return `{ failError: 'Rate limited: API call budget reached. Retry again.', failStatus: 429, forfeit: false }`.
  - In `GET /:matchId/state/:gameId`, when `!engine.trackApiCall(...)`, return status 429 with `{ error: 'Rate limited: API call budget reached. Retry again.' }` instead of 403 forfeit.
- Update `src/server/game/Budget.test.ts`:
  - Red-Green TDD verifying that exceeding `MAX_API_CALLS_PER_GAME` returns `false` / rate-limited response while the game remains in progress (`status: 'active'`, no winner, no `api_limit` result).

**Blocked by:** None.

**Status:** resolved

- [x] Unit tests updated in `Budget.test.ts` to assert non-forfeiture on API limit.
- [x] `MatchEngine.ts` updated to remove `completeGame` on `api_limit`.
- [x] `src/server/api/match.ts` updated to return HTTP 429 without `forfeit: true`.
