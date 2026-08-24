# ADR-007: Starting Positions

## Status

Accepted

## Date

2026-08-24

## Context

If every game starts from the standard initial position, the benchmark mostly measures opening knowledge plus chess ability. Multiple starting position modes test different capabilities and prevent memorization.

## Decision

Support two starting position modes:

### Mode 1: Standard Chess

Starting position: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR`

- Tests opening knowledge, middle-game strategy, endgame technique
- Most familiar to LLMs (likely seen in training data)
- Baseline for all comparisons

### Mode 2: Chess960 (Fischer Random)

960 possible starting positions with:

- Bishops on opposite colors
- King between rooks
- No pawns on first rank (except standard)
- Random piece placement

- Tests adaptability and pure calculation
- Reduces opening preparation advantage
- Forces creative problem-solving
- More representative of "real" chess ability

### Position Selection

| Mode     | Selection Method     | Seed           |
| -------- | -------------------- | -------------- |
| Standard | Fixed                | N/A            |
| Chess960 | PRNG with match seed | Match-specific |

Chess960 positions are generated deterministically from the match seed. This ensures reproducibility — the same seed produces the same position.

### Future Modes (Not in v1)

The architecture supports adding modes later:

- Random legal positions
- Tactical puzzles
- Endgame studies
- Opening book positions

These are deferred to future versions to keep the initial release focused.

## Consequences

1. The server must implement Chess960 position generation
2. Chess960 games need special handling (no standard opening book)
3. FEN encoding must support Chess960 castling rights
4. The benchmark can compare Standard vs Chess960 performance per model
5. Tournament format can specify which mode(s) to use

## Rationale

Standard + Chess960 covers the two most important dimensions: traditional chess knowledge and pure adaptive ability. Chess960 is particularly valuable because it neutralizes opening preparation, forcing models to rely on actual chess understanding rather than memorized lines.
