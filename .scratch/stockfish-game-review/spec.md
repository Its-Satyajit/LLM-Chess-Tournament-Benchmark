# Spec: Stockfish.js Game Review & Move Classification in Replay Theatre

Status: ready-for-agent

## Problem Statement

When users and benchmark evaluators inspect completed games in the Replay Theatre (`/replay/[matchId]/[gameId]`), they only see the raw chess board, clock times, and move list. There is no automated analysis of move quality, player accuracy, blunder counts, or tactical advantage swings. Users cannot discern whether an LLM made a brilliant sacrifice, played book theory, made subtle inaccuracies, or committed catastrophic blunders, nor can they quantify relative model performance on a standard 0–100% accuracy scale or estimated game ELO rating.

## Solution

Integrate `stockfish.js` (`https://github.com/nmrugg/stockfish.js/`) into the Replay Theatre running client-side inside a dedicated Web Worker with zero server CPU overhead. Provide a comprehensive Game Review suite featuring:
- Overall White and Black Accuracy scores (0–100%) with comparative visual meters.
- Estimated Game Performance Ratings for White and Black.
- Side-by-side move classification counts with dual-mode labeling toggle:
  - **Tournament Mode**: Brilliant, Very Good, Best, Excellent, Good, Theoretical/Book, Inaccuracy, Mistake, Miss, Blunder.
  - **Streamer / Sigma Mode**: Sigma, Awesome, Best, Nice, Ok, Theoretical, Strange, Bad, Miss, Clown.
- Interactive Scoresheet badges showing the classification badge and evaluation for every ply.
- Dynamic evaluation bar beside the chess board showing current advantage.
- Interactive advantage timeline chart (click to jump to any ply).
- Average Centipawn Loss (ACPL) and telemetry metrics.
- Caching layer (IndexedDB/localStorage with optional server persistence) so games analyzed once load instantaneously on revisit.

## User Stories

1. As a benchmark analyst, I want to click "Start Review" on any replay page, so that Stockfish analyzes all moves in the game without freezing my browser.
2. As a benchmark analyst, I want to see a live progress bar and ply counter during analysis, so that I know how much of the game review remains.
3. As a user, I want to see White and Black overall Accuracy scores (e.g. 85.0% vs 84.1%), so that I can compare the precision of both competing models.
4. As a user, I want to see an estimated Game Performance Rating for both White and Black, so that I can gauge the strength level played in this specific game.
5. As a user, I want to see a breakdown table of move classifications comparing White vs Black (Brilliant, Very Good, Best, Excellent, Good, Theoretical, Inaccuracy, Mistake, Miss, Blunder).
6. As a user, I want a toggle switch between "Tournament" and "Streamer / Sigma" modes, so that I can view traditional chess labels or humorous/streamer labels (Sigma, Awesome, Best, Nice, Ok, Theoretical, Strange, Bad, Miss, Clown).
7. As a user, I want every move in the interactive scoresheet to display an icon and color-coded badge indicating its classification (e.g. cyan for Brilliant/Sigma, green for Best, red for Blunder/Clown).
8. As a user, I want to see a vertical evaluation bar next to the chess board that moves smoothly as I step through plies.
9. As a user, I want an interactive advantage timeline graph below the board where clicking any move peak jumps the board to that ply.
10. As a user, I want to see Average Centipawn Loss (ACPL) for both players, so that I can measure tactical precision over the full game.
11. As a mobile or low-power user, I want to select analysis depth (Quick Depth 10, Standard Depth 14, Deep Depth 18), so that I can balance speed and depth according to my hardware.
12. As a returning user, I want previously analyzed game reviews to load immediately from local cache, so that I do not need to re-run Stockfish on the same game.
13. As a developer, I want the analysis engine to run completely client-side in a Web Worker using assets hosted in `public/stockfish/`, so that the platform remains 100% resilient offline with zero external CDN dependencies.

## Implementation Decisions

- **Engine Asset Delivery**: Self-host `stockfish.js` worker assets in `public/stockfish/stockfish.js`. The Web Worker is spawned via standard browser `new Worker('/stockfish/stockfish.js')` when analysis starts.
- **Worker Management & UCI Bridge**: A dedicated `StockfishClient` wrapper managing UCI initialization (`uci`, `isready`, `ucinewgame`), position loading (`position fen ... moves ...`), evaluation commands (`go depth <d>`), and output parsing.
- **Mathematical Models & Metrics**:
  - Win Probability: $W(cp) = 50 + 50 \times \tanh(0.00368208 \times cp)$.
  - Ply Accuracy: $103.1668 \times \exp(-0.04354 \times \Delta W) - 3.1669$, clamped between $0\%$ and $100\%$.
  - ACPL: Arithmetic mean of centipawn losses on player plies.
  - Performance Rating: Empirical calibration curve mapping accuracy and ACPL to rating (600–2900+).
- **Classification Engine**:
  - Theoretical/Book: Standard opening ECO database matching initial moves.
  - Brilliant / Sigma: Decisive material sacrifice or sole winning tactic preserving high advantage.
  - Best: Engine's top move ($< 10$ cp loss).
  - Very Good / Awesome: $10\text{–}25$ cp loss.
  - Excellent / Nice: $25\text{–}50$ cp loss.
  - Good / Ok: $50\text{–}90$ cp loss.
  - Inaccuracy / Strange: $90\text{–}175$ cp loss.
  - Mistake / Bad: $175\text{–}300$ cp loss.
  - Miss: Dropping $> 25\%$ win probability from an advantageous position.
  - Blunder / Clown: $> 300$ cp loss or turning winning/equal into lost.
- **UI Architecture**:
  - `GameReviewCard`: Summary card showing White vs Black accuracy gauges, estimated ELO, classification table, and depth selector.
  - `EvalBar`: Vertical evaluation bar (-10 to +10 cp / mate indicators).
  - `AdvantageGraph`: SVG timeline visualizing evaluation over plies with clickable points.
  - `Scoresheet`: Updated `MoveButton` showing classification badges and dual-label text according to active mode.
- **Persistence Layer**: Cache review payloads in browser storage (`localStorage` / IndexedDB) under key `review:${matchId}:${gameId}`. Optional backend persistence endpoint `/api/replay/[matchId]/[gameId]/review`.

## Testing Decisions

- Tests will focus strictly on observable external behavior, avoiding private implementation details.
- **Engine Protocol & UCI Parser Tests**: Test parsing of engine info strings, mate score conversions, bestmove extractions, and depth handling with mock streams.
- **Classification & Metrics Unit Tests**: Deterministic validation of win-probability transitions, accuracy calculation edge cases (0 cp loss -> 100%, blunders -> low accuracy), ACPL calculation, and classification assignment.
- **Component Tests**: `@testing-library/react` tests for `GameReviewCard`, mode toggling between Tournament and Streamer/Sigma, scoresheet badge rendering, and keyboard/click navigation.

## Out of Scope

- Real-time engine evaluation during live ongoing matches (only post-game Replay Theatre review is in scope).
- Server-side distributed GPU Stockfish clustering.
- Opening repertoire book editor.

## Further Notes

- Respects `docs/ADR-021-stockfish-game-review.md` and `CONTEXT.md`.
