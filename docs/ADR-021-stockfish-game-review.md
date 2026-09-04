# ADR-021: Stockfish.js Game Review & Replay Move Classification

## Status

Accepted

## Date

2026-09-04

## Context

The Replay Theatre (`/replay/[matchId]/[gameId]`) currently renders move-by-move board states and clocks, but lacks deep engine analysis. Users require an automated Game Review experience powered by Stockfish.js (`https://github.com/nmrugg/stockfish.js/`) that provides:
1. White and Black overall Accuracy scores (0–100%).
2. Move classification breakdown (Brilliant/Sigma, Very Good/Awesome, Best/Best, Excellent/Nice, Good/Ok, Theoretical, Inaccuracy/Strange, Mistake/Bad, Miss, Blunder/Clown).
3. Estimated Game Rating (performance ELO).
4. Derived telemetry: evaluation chart, eval bar, ACPL (Average Centipawn Loss), and advantage graphs.

## Decision Drivers

- Performance and responsiveness: Chess games can span 80+ plies; running deep Stockfish evaluations should not freeze the browser UI.
- Offline and client-side capability: Stockfish.js via WebAssembly/Web Worker can run directly in the browser without requiring heavy server GPU/CPU clusters.
- Persistence: Avoid re-evaluating identical games repeatedly if visited multiple times.
- Visual hierarchy: Clean integration into Next.js App Router and Tailwind CSS v4 design system.

## Proposed Options

- **Option A (Pure Client Web Worker with Local Caching)**: Stockfish runs in a dedicated browser Web Worker. Evaluation results are cached in client storage (IndexedDB/localStorage).
- **Option B (Server Background Worker with SQLite Cache)**: Evaluation happens on the Elysia backend on game completion; results are stored in SQLite and served over REST.
- **Option C (Client Web Worker with Server API Sync)**: Stockfish.js evaluates client-side via Web Worker; upon completion, results can be synced/cached on the server so other viewers benefit immediately.

## Decision

We adopt **Client-Side Web Worker Execution with Local Caching and Optional Server Sync (Option A/C)**:
1. Stockfish.js (`https://github.com/nmrugg/stockfish.js/`) runs in a dedicated browser Web Worker off the main React rendering thread.
2. An on-demand Game Review process analyses game plies sequentially at configurable depth (default depth 14–16).
3. Evaluated games, move classifications, win percentages, and accuracy scores are cached in IndexedDB/localStorage keyed by `${matchId}:${gameId}` for instantaneous subsequent visits.
4. An optional REST endpoint `/api/replay/[matchId]/[gameId]/review` allows persisting and retrieving cached reviews across clients.

### Presentation & Dual-Labeling System

- **Dual-Mode Toggle**: The Replay Theatre provides a toggle between **Tournament Mode** (Brilliant, Very Good, Best, Excellent, Good, Book/Theoretical, Inaccuracy, Mistake, Miss, Blunder) and **Streamer / Sigma Mode** (Sigma, Awesome, Best, Nice, Ok, Theoretical, Strange, Bad, Miss, Clown).
- **Scoresheet Badges**: Each ply in the interactive scoresheet displays its classification badge with color-coding and icons.
- **Game Review Dashboard Card**: A high-impact summary card showing:
  - White & Black Accuracy (%) with comparative visual gauges.
  - Estimated Game Performance Ratings for White & Black.
  - Side-by-side move classification counter table.
  - Average Centipawn Loss (ACPL).
  - Advantage timeline graph (interactive SVG chart clicking any ply).
  - Live vertical evaluation bar alongside the chess board.

### Engine Asset Delivery & Analysis Depth

- **Asset Location**: Self-hosted in `public/stockfish/stockfish.js` (Web Worker + WASM from `nmrugg/stockfish.js`) ensuring zero external network dependencies and complete offline resilience.
- **Default Depth**: Standard Depth 14 (~100–150ms per ply), with selectable preset levels: Quick (Depth 10), Standard (Depth 14), and Deep (Depth 18).

### Classification Thresholds & Formulas

- **Win Probability ($W$)**: $W(cp) = 50 + 50 \times \tanh(0.00368208 \times cp)$
- **Ply Accuracy**: $103.1668 \times \exp(-0.04354 \times \Delta W) - 3.1669$, clamped between $0\%$ and $100\%$.
- **Classifications**:
  - **Theoretical / Book**: Standard opening book moves.
  - **Brilliant (Sigma)**: Critical sacrifice or sole decisive tactic maintaining $\ge +2.0$ advantage.
  - **Best**: Engine's top move ($< 10$ cp loss).
  - **Very Good (Awesome)**: Strong move ($10\text{–}25$ cp loss).
  - **Excellent (Nice)**: Minor drop ($25\text{–}50$ cp loss).
  - **Good (Ok)**: Sound move ($50\text{–}90$ cp loss).
  - **Inaccuracy (Strange)**: $90\text{–}175$ cp loss.
  - **Mistake (Bad)**: $175\text{–}300$ cp loss.
  - **Miss**: Missed winning tactic (win probability drop $> 25\%$ from winning state).
  - **Blunder (Clown)**: Critical blunder ($> 300$ cp loss or game-flipping mistake).
- **Game Performance Rating**: Computed via weighted accuracy and ACPL calibrated against FIDE/USCF performance tables.
