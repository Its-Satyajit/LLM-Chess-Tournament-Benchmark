# Spec: Persisted Benchmark Metrics and Analytics Dashboard

Status: ready-for-agent

## Problem Statement

1. **Ephemeral Engine Reviews**: Post-game Stockfish evaluations (move accuracy %, blunder/mistake/brilliant classification frequencies, evaluation trajectories) were computed only on the client inside browser Web Workers during replay sessions. They were not stored in the database, requiring expensive re-computation on every visit and making cross-model comparative analysis impossible.
2. **Scattered Telemetry**: Granular match telemetry (think times, token efficiency, illegal move rates, tactical captures/checks) was stored in raw `events` rows, requiring dynamic filtering and aggregation on each request.
3. **Absence of Unified Benchmark Matrices**: The application lacked a dedicated analytical view comparing all benchmarked LLMs across multi-dimensional criteria (Elo vs Accuracy, Think Time vs Blunder Rate, Token Efficiency, and Move Quality Distributions).

## Solution

1. **Database Schema Enhancements**:
   - Add `game_reviews` table in `src/server/db/schema.ts` to store deep engine reviews:
     - `id` (PK, string)
     - `gameId` (FK games.id, unique)
     - `matchId` (string)
     - `depth` (integer)
     - `whiteAccuracy` (real), `blackAccuracy` (real)
     - `whiteRating` (integer), `blackRating` (integer)
     - `classificationCounts` (text JSON)
     - `plies` (text JSON)
     - `createdAt` (timestamp)
   - Add `metrics` column to `matches` table to cache aggregate match metrics JSON.
2. **Database Service Methods**:
   - `saveGameReview(review)`
   - `getGameReview(gameId)`
   - `getBenchmarkMetrics()`: computes cross-model benchmark matrix by aggregating `ratings`, `matches`, `events`, and `game_reviews`.
3. **API Endpoints**:
   - `POST /api/game/:gameId/review`: Persists deep Stockfish review data.
   - `GET /api/game/:gameId/review`: Returns cached game review.
   - `GET /api/benchmark`: Returns cross-model benchmark matrices.
4. **Game Review Uplink**:
   - In `Replay.tsx`: When review analysis completes, automatically upload it to `/api/game/:gameId/review`. If review already exists in DB, load it immediately on page open without re-running engine.
5. **Benchmark Analytics Dashboard (`/benchmark`)**:
   - Route `/benchmark` backed by `src/views/Benchmark.tsx`.
   - 4 Interactive SVG visual charts powered by `@tanstack/react-query`:
     1. **Elo vs. Accuracy**: Scatter/bubble comparison of rating vs accuracy.
     2. **Move Classification Distribution**: Stacked bar chart of Brilliant/Best/Good vs Inaccuracy/Mistake/Blunder.
     3. **Think Time vs. Blunder Rate**: Scatter/bar comparison of model reasoning speed vs blunder frequency.
     4. **Token Efficiency**: Average tokens per move across model families.
   - Filterable benchmark metrics matrix table with sorting, provider filters, and direct links.
   - Header navigation link to `/benchmark`.

## User Stories

1. As a benchmark operator, I want game reviews saved to the database once computed, so that neither spectators nor automated pipelines need to re-run expensive engine analysis on future visits.
2. As a benchmark analyst, I want to visit `/benchmark` to compare all participating models across Elo, accuracy, blunder rates, and token efficiency in clean visual charts.
3. As a spectator, I want to filter benchmark matrices by provider (OpenAI, Anthropic, Google, DeepSeek) and sort models by accuracy or speed.
4. As a user opening `/replay/[matchId]/[gameId]`, I want pre-computed reviews to load instantly from the database without waiting 10-15 seconds for Web Worker evaluation.

## Testing Decisions

- Unit tests for schema and database operations (`schema.test.ts`, `database.test.ts`).
- Integration tests for `/api/benchmark` and `/api/game/:gameId/review` in `src/server/api/benchmark.test.ts`.
- Component tests for `src/views/Benchmark.test.tsx` verifying chart renders, loading states, and table sorting.
