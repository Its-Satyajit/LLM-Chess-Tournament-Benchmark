# 04: Chess Logic Wrapper & Game State Management

**What to build:** A chess.js wrapper that manages game state, validates moves, detects checkmate/stalemate/draws, generates legal moves (for Assisted mode), and handles Chess960 starting positions.

**Blocked by:** 02-shared-types, 03-database-schema

**Status:** ready-for-agent

- [ ] Create `ChessGame` class wrapping chess.js
- [ ] Implement `getGameState()` returning FEN, turn, history
- [ ] Implement `getLegalMoves()` for Assisted mode
- [ ] Implement `makeMove(move)` with validation
- [ ] Implement `isGameOver()` detection (checkmate, stalemate, repetition, 50-move, insufficient material)
- [ ] Implement `getResult()` returning winner and reason
- [ ] Implement Chess960 starting position generation from seed
- [ ] Implement `getStateFromFEN(fen)` for restoring game state
- [ ] Write comprehensive tests for all chess logic
- [ ] Write tests for Chess960 position generation
- [ ] Write tests for draw detection (all 5 types)
- [ ] Write tests for illegal move rejection
- [ ] Verify all tests pass
