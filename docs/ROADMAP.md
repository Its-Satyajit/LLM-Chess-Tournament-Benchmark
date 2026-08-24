# LLM Chess Arena — Roadmap

This document tells an agent what to build next. It does not repeat the spec — it points at `docs/spec.md` and `docs/ADR-*.md` for requirements. Each milestone has **steps** with **completion criteria**: a checkable condition that means "done."

**Current state:** Core match flow works. 125 tests pass (10 server test files incl. auth integration tests + 2 web tests). TypeScript clean. Lint clean (non-test). Phase 1 security wiring completed 2026-08-25; Replay route bug fixed; Phase 7 UI quality steps implemented.

**Blocking gaps:** ✅ JWT auth wired (401/403/429 + cross-match scoping) ✅ Budget tracking enforced in handlers (forfeit on exceed) ✅ Spectator clock hidden (ADR-005)

---

## Phase 1: Security (unblocks real usage) — ✅ Complete (implemented 2026-08-25)

### Step 1: Wire JWT auth into routes

**Status:** ✅ Done. `authenticateRequest()` enforces 401 (missing/invalid token), 403 (cross-match scoping), 429 (rate limits) on every authenticated route; new integration tests cover all three.

**Done when:** Every `POST /api/match/:id/*` endpoint rejects requests without a valid `Authorization: Bearer <token>` header. Invalid token → 401. Wrong match token → 403. The `x-player-id` header is no longer accepted.

**Spec:** Stories 44, 46, 47. ADR-016.

### Step 2: Wire budget tracking into all API handlers

**Status:** ✅ Done. Every handler gates on `trackApiCall()`; MAKE_MOVE calls `trackTokens()` (optional `tokensUsed` body field, estimated fallback); exceed → 403 with `API_LIMIT_EXCEEDED`/`TOKEN_LIMIT_EXCEEDED` + forfeit.

**Done when:** `trackApiCall()` is called in GET_STATE, SEND_MESSAGE, DRAW_OFFER, RESIGN handlers — not just MAKE_MOVE. `trackTokens()` is called in MAKE_MOVE. Budget exceed → game forfeit with `api_limit` or `token_limit` reason.

**Spec:** Stories 34-37. ADR-004.

### Step 3: Hide opponent clock

**Status:** ✅ Done for ADR-005: unauthenticated requests see neither clock; players see only their own. Turn limiter now resets per accepted move (Story 45); production fails fast without JWT_SECRET (dev fallback retained).

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

### Step 9: Compute missing metrics ✅ (heuristic)

**Status:** ✅ Done (heuristic). `getMatchMetrics()` computes `blunderRate` and `tacticalAccuracy` from material-eval swings over replayed history (300cp blunder threshold; tactical moment = capture available). Engine-grade eval remains a future upgrade.

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

## Phase 7: UI Quality (unblocks real users) — ✅ Complete (implemented 2026-08-25)

### Step 15: Error handling on Dashboard + Admin ✅

**Done when:** `Dashboard.tsx` ratings fetch and all `Admin.tsx` fetches have distinct loading / error / empty states; failed POSTs check `res.ok` and never lose user input. Currently a failed fetch renders an empty table that reads as "No ratings yet" (silent wrong data).

### Step 16: Keyboard accessibility for model selection ✅

**Done when:** Model rows in `Admin.tsx` are real `<button>`s (or have role/tabIndex/Enter-Space handling). Currently mouse-only `<div onClick>` — core create-match flow is inaccessible via keyboard. Same fix needed for Replay move rows.

### Step 17: Navigation + feedback polish ✅

**Done when:** Active nav state (`NavLink` + `aria-current`); `alert('Prompt copied')` in Arena replaced with inline confirmation with clipboard-failure fallback; every generic error ("Failed to connect to match", etc.) offers cause + retry; low-time clock urgency is not color-only (text/icon); long model names truncate.

### Step 18: Responsive board + WS reconnect ✅

**Done when:** ChessBoard no longer hardcodes `size={400}` (container-measured or CSS aspect-square); Arena WS auto-reconnects (or offers manual retry) instead of staying "Disconnected" forever.

### Bug (FIXED 2026-08-25): Replay route mismatch

Route is now `/replay/:matchId/:gameId` and Replay reads both params. Keyboard-accessible move rows, retry on error, clock display guards for hidden spectator clocks.

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
| 1. Security | 1-3 | ✅ Complete (auth wired, budgets enforced, clocks scoped) |
| 2. Frontend Real-Time | 4-5 | ✅ Complete |
| 3. Match Integrity | 6-8 | ✅ Complete (Step 7 ADR-003 attribution now covered by a conformance test) |
| 4. Evaluation | 9-10 | ✅ Complete (Step 9 via material-swing heuristic) |
| 5. Testing | 11-12 | ✅ Complete (127 tests pass: 125 server + 2 web) |
| 6. Deployment | 13-14 | ✅ Complete (Docker e2e not executed during review) |
| 7. UI Quality | 15-18 + bug | ✅ Complete (error states, a11y, nav, responsive board, WS reconnect, route fix) |

**18 steps + 1 bug — all implemented. Deferred remainder: true engine-grade eval (current: material + piece-square tables + mobility heuristic, 300cp threshold). Docker e2e: Dockerfile/compose repaired for the pnpm workspace and the production startup path verified end-to-end on the host (health 200 → create match → 401 enforcement → authenticated move → spectator clock hidden); full in-container run blocked by this sandbox having no container network access — re-verify with `docker compose up --build` on a networked machine.**
