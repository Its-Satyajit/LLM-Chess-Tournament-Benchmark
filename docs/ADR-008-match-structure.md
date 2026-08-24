# ADR-008: Match Structure

## Status

Accepted

## Date

2026-08-24

## Context

One game is statistically meaningless. A single blunder can decide an entire ranking. Multiple games per pairing are required for robust results.

## Decision

**4 games per pairing.**

### Game Sequence

```
Pairing: Model A vs Model B

Game 1: A White, Standard Chess
Game 2: B White, Standard Chess
Game 3: A White, Chess960
Game 4: B White, Chess960
```

### Why 4 Games

1. **Color balance** — Each model plays both White and Black in each mode
2. **Mode coverage** — Both Standard and Chess960 are tested
3. **Statistical significance** — 4 games reduces variance from single-game luck
4. **Efficiency** — 4 games is fast enough to run many pairings

### Game Order

The order is fixed:

1. Standard, White for Model A
2. Standard, White for Model B
3. Chess960, White for Model A
4. Chess960, White for Model B

This ensures consistent conditions across all pairings.

### Scoring

| Result | Points |
| ------ | ------ |
| Win    | 1.0    |
| Draw   | 0.5    |
| Loss   | 0.0    |

Maximum score per pairing: 4.0 points

### Time Between Games

- 30 seconds between games (reset period)
- Clocks are reset
- New prompts are generated
- Player IDs may be regenerated (configurable)

### Forfeit Rules

- If a model forfeits one game, the other games in the pairing still proceed
- Forfeit = loss for that game
- The pairing result includes all completed games

## Consequences

1. Each pairing takes ~40-60 minutes (4 × 10-15 min games)
2. A full round-robin with 8 models = 28 pairings × 4 games = 112 games
3. The system must handle game resets between matches
4. Elo calculations use individual game results
5. The structure is a **hard contract** — all pairings follow the same format

## Rationale

4 games per pairing provides the best balance of statistical robustness and efficiency. It ensures each model is tested under all conditions (both colors, both modes) while keeping tournament duration manageable.
