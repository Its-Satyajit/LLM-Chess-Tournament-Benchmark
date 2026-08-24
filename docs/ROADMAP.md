# LLM Chess Arena — Roadmap

This document tells an agent what to build next. It does not repeat the spec — it points at `docs/spec.md` and `docs/ADR-*.md` for requirements. Each milestone has **steps** with **completion criteria**: a checkable condition that means "done."

**Current state:** Core match flow works. 121 tests pass (10 unit test files + 1 integration test file + 2 web tests). TypeScript clean. Lint clean (non-test). ~85% of spec stories implemented. All 6 phases complete.

**Blocking gaps (fixed):** ✅ JWT auth wired ✅ Budget tracking wired ✅ Opponent clock hidden

---

## Phase 1: Security (unblocks real usage)

### Step 1: Wire JWT auth into routes

**Done when:** Every `POST /api/match/:id/*` endpoint rejects requests without a valid `Authorization: Bearer <token>` header. Invalid token → 401. Wrong match token → 403. The `x-player-id` header is no longer accepted.

**Spec:** Stories 44, 46, 47. ADR-016.

### Step 2: Wire budget tracking into all API handlers

**Done when:** `trackApiCall()` is called in GET_STATE, SEND_MESSAGE, DRAW_OFFER, RESIGN handlers — not just MAKE_MOVE. `trackTokens()` is called in MAKE_MOVE. Budget exceed → game forfeit with `api_limit` or `token_limit` reason.

**Spec:** Stories 34-37. ADR-004.

### Step 3: Hide opponent clock

**Done when:** `getGameState()` returns only the requesting player's clock, not both. The `clock` field shows `{ white: <white_seconds> }` or `{ black: <black_seconds> }` depending on which player requests.

**Spec:** Story 39. ADR-005 visibility matrix.

---

## Phase 2: Frontend Real-Time (unblocks live spectating)

### Step 4: Connect Arena to WebSocket ✅

**Done when:** Arena page opens a WS connection on match load, subscribes to the match, and receives `move_made` / `message_sent` / `game_over` events. The 1-second polling `setInterval` is removed. The WS status indicator shows "Live" when connected.

**Spec:** Stories 54-55.

### Step 5: Replay page FEN reconstruction ✅

**Done when:** Replay page reconstructs the board position at each move by replaying the move list from the initial FEN. Clicking move N shows the position after move N, not the final position.

**Spec:** Story 57.

---

## Phase 3: Match Integrity (unblocks fair play)

### Step 6: Fresh player IDs per game ✅ ✅

**Done when:** Each of the 4 games in a match gets its own `playerAId` / `playerBId` pair. Game 1 IDs ≠ Game 2 IDs. The prompt shows the game-specific ID.

**Spec:** Story 33.

### Step 7: Clock runs during API processing ✅

**Done when:** The clock deducts time between the API request arriving and the response being sent — not just during `makeMove`. This means wrapping each player-facing endpoint in a clock start/stop.

**Spec:** Story 29. ADR-003.

### Step 8: Complete match manifest ✅

**Done when:** `GET /api/match/:id/manifest` returns all fields from the spec: `manifest_version`, `benchmark_version`, `chess960_seed`, `prompt.version`, `prompt.template_hash`, `rules.*`, `seeds.*`, `environment.*`. Missing fields → 500.

**Spec:** Story 59. ADR-015.

---

## Phase 4: Evaluation (unlocks diagnostic metrics)

### Step 9: Compute missing metrics ✅

**Done when:** `getMatchMetrics()` returns `avgResponseTime`, `blunderRate`, `tacticalAccuracy` in addition to existing win/draw/illegal-move rates. All computed from the event log.

**Spec:** Stories 52-53. ADR-017.

### Step 10: Dashboard reads from DB ✅

**Done when:** Leaderboard fetches ratings from SQLite (via `GET /api/ratings`), not from in-memory tournament manager. Ratings persist across server restarts.

**Spec:** Story 56.

---

## Phase 5: Testing (hardens everything)

### Step 11: API integration tests ✅

**Done when:** Every endpoint in `docs/spec.md` § API Endpoints has at least one Vitest test that hits it via HTTP (using `ElysiaJS` test client or supertest). Tests cover: happy path, auth rejection (401), wrong-match rejection (403), rate limiting, budget enforcement.

**Spec:** Testing decisions in spec.md.

### Step 12: Clock integration tests ✅

**Done when:** Tests verify: flag fall triggers loss, insufficient material triggers draw, 30-second reset blocks moves, clock pauses on server error, clock does NOT pause on model error.

**Spec:** ADR-003 timeout handling table.

---

## Phase 6: Deployment (unblocks self-hosting)

### Step 13: Docker works end-to-end ✅

**Done when:** `docker compose up` starts server + web + SQLite. The health endpoint returns 200. A match can be created and played through the Docker setup.

**Spec:** Story 68.

### Step 14: Environment documentation ✅

**Done when:** `.env.example` exists with every required variable documented. `README.md` § Setup lists all env vars and their purpose. No variable is undocumented.

**Spec:** Story 70.

---

## Deferred (not v1)

These are explicitly out of scope per spec § Out of Scope:

- Import configs from Codex CLI / Open Code (Story 66)
- Immutable model configs (Story 67)
- Post-match identity reveal (Story 58)
- Swiss / knockout tournament formats (ADR-009)
- shadcn/ui components
- Playwright E2E tests
- Vercel deployment
- GitHub Actions CI/CD

---

## Summary

| Phase | Steps | Status |
|-------|-------|--------|
| 1. Security | 1-3 | ✅ Complete |
| 2. Frontend Real-Time | 4-5 | ✅ Complete |
| 3. Match Integrity | 6-8 | ✅ Complete |
| 4. Evaluation | 9-10 | ✅ Complete |
| 5. Testing | 11-12 | ✅ Complete |
| 6. Deployment | 13-14 | ✅ Complete |

**14 steps. Each has a checkable completion criterion. Start with Phase 1.**
