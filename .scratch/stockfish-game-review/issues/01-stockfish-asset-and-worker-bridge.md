# 01: Stockfish Engine Asset & Web Worker UCI Bridge

**What to build:**
Self-host `stockfish.js` assets in `public/stockfish/` and create the typed `StockfishClient` Web Worker wrapper that initializes the UCI engine, issues search commands (`go depth <d>`), parses engine output streams (`info depth`, `score cp`, `score mate`, `pv`, `bestmove`), and handles graceful termination and error recovery.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `public/stockfish/stockfish.js` exists and is served statically by Next.js.
- [x] `StockfishClient` interface defined with methods: `init()`, `evaluatePosition(fen, depth)`, `terminate()`.
- [x] UCI stream parser correctly extracts depth, score (cp or mate), and bestmove.
- [x] Vitest unit tests verify parser and mock worker execution.
