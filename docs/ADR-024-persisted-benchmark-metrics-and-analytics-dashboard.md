# ADR-024: Persisted Benchmark Metrics and Analytics Dashboard

## Status

Accepted

## Date

2026-09-04

## Context

1. **Ephemeral Engine Reviews**: Post-game Stockfish evaluations (move accuracy %, blunder/mistake/brilliant classification frequencies, evaluation trajectories) were computed exclusively in client-side Web Workers during replay sessions. They were not stored in the database, requiring expensive re-computation on every visit and making cross-model comparative analysis impossible.
2. **Scattered Telemetry**: Granular match telemetry (think times, token efficiency, illegal move rates, tactical captures/checks) was stored in raw `events` rows, requiring dynamic filtering and aggregation on each request.
3. **Absence of Unified Benchmark Matrices**: The application lacked a dedicated analytical view comparing all benchmarked LLMs across multi-dimensional criteria (Elo vs Accuracy, Think Time vs Blunder Rate, Token Efficiency, and Move Quality Distributions).

## Decision

1. **Database Schema Enhancements (`src/server/db/schema.ts`)**:
   - **`game_reviews` table**:
     - `id` (text primary key), `gameId` (text foreign key to `games.id`), `matchId` (text), `depth` (integer).
     - `whiteAccuracy` (real), `blackAccuracy` (real).
     - `whiteRating` (integer), `blackRating` (integer).
     - `classificationCounts` (text JSON storing White and Black counts for Brilliant, Best, Excellent, Good, Inaccuracy, Mistake, Miss, Blunder).
     - `plies` (text JSON storing ply-by-ply evaluations, centipawns, win probabilities).
     - `createdAt` (timestamp).
   - **`matches` table enhancement**:
     - Add `metrics` column (text JSON snapshot) caching aggregate match metrics (`totalMoves`, `avgThinkTimeSeconds`, `maxThinkTimeSeconds`, `avgTokensPerMove`, `totalTokensUsed`, `blunderRate`, `tacticalAccuracy`, `illegalMoveRate`).

2. **Ingestion & Persistence Endpoints (`src/server/api/benchmark.ts` & `src/server/api/review.ts`)**:
   - `POST /api/game/:gameId/review`: Persists deep Stockfish review data from client/evaluator into `game_reviews`.
   - `GET /api/game/:gameId/review`: Loads cached game review from the database.
   - `GET /api/benchmark`: Aggregates all participating models across matches, combining ratings, persisted event metrics, and available Stockfish accuracy into a unified comparative benchmark matrix.

3. **Dedicated Benchmark Analytics UI (`/benchmark`)**:
   - Create Next.js App Router route `/benchmark` backed by `src/views/Benchmark.tsx`.
   - Render 4 responsive, high-contrast SVG benchmark charts:
     - **Elo vs. Accuracy Scatter / Comparison Chart**: Plotting tactical precision against tournament rating.
     - **Move Classification Breakdown**: Stacked bar chart showing proportions of Brilliant/Best/Good vs Blunder/Mistake/Inaccuracy per model.
     - **Think Time vs. Blunder Rate**: Scatter/bar comparison of model reasoning speed vs tactical reliability.
     - **Token Efficiency Chart**: Tokens consumed per move across model families.
   - Comprehensive filterable, sortable matrix table with model stats, provider badges, and direct drill-downs.

## Consequences

- Game reviews are calculated once and stored permanently in the database for instant retrieval.
- Operators and spectators can analyze benchmark results across all competing models on `/benchmark` with rich interactive visual charts.
- Server maintains clean separation between rapid event persistence and cached aggregate benchmark matrices.
