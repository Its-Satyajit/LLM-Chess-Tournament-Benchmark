# 03: Game Review Coordinator & Local Storage Cache

**What to build:**
A game review coordinator service that receives a game's move history, spawns `StockfishClient`, runs sequential evaluations across all plies, streams progress updates (`currentPly`, `totalPlies`, `percentage`), computes the complete review payload, and persists/restores reviews in browser storage (`localStorage` / IndexedDB).

**Blocked by:** 01: Stockfish Engine Asset & Web Worker UCI Bridge, 02: Game Review Math, Accuracy Calculation & Move Classifications

**Status:** resolved

- [x] Sequential evaluation loops through all FENs without blocking the UI.
- [x] Progress callback streams accurate progress during review.
- [x] Completed reviews are saved to `localStorage` under `review:${matchId}:${gameId}`.
- [x] Cache retrieval returns instantly when game review already exists.
- [x] Vitest unit tests verify coordinator flow and caching with mock worker.
