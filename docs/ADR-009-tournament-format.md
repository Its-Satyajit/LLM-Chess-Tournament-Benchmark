# ADR-009: Tournament Format

## Status

Accepted

## Date

2026-08-24

## Context

The tournament format determines how models are paired and ranked. The format must be fair, reproducible, and scalable.

## Decision

Two-layered ranking system:

### Layer 1: Benchmark Rating (Persistent)

A continuous **Glicko-2** rating that persists across tournaments.

- Updated after every game
- Reflects long-term chess ability
- New models start at a provisional rating (e.g., 1500)
- Rating includes rating deviation (uncertainty)
- Independent of any specific tournament

### Layer 2: Tournament (Temporary)

A structured competition using the benchmark ratings.

**Default format: Round Robin**

Everyone plays everyone. Most fair, gives complete picture.

### Tournament Structure

```
Tournament: "August 2026 Arena"
Format: Round Robin
Participants: 8 models
Games per pairing: 4
Total games: 8 × 7 / 2 × 4 = 112 games
```

### Pairing Schedule

Round-robin generates a complete pairing schedule:

```
Round 1: A-B, C-D, E-F, G-H
Round 2: A-C, B-D, E-G, F-H
Round 3: A-D, B-C, E-H, F-G
...etc
```

Each round runs all pairings in parallel (if resources allow).

### Tournament Results

| Model   | Games | Wins | Draws | Losses | Points | Rating Δ |
| ------- | ----- | ---- | ----- | ------ | ------ | -------- |
| Model A | 28    | 18   | 6     | 4      | 21.0   | +87      |
| Model B | 28    | 16   | 8     | 4      | 20.0   | +62      |
| Model C | 28    | 14   | 7     | 7      | 17.5   | +31      |
| ...     | ...   | ...  | ...   | ...    | ...    | ...      |

### Future Formats (Configurable)

The architecture supports adding formats later:

- Swiss system
- Double round robin
- Knockout bracket
- League format

These can be enabled via tournament configuration.

## Consequences

1. Glicko-2 rating system must be implemented
2. Round-robin scheduling must be generated automatically
3. Ratings persist in a database across tournaments
4. New models start with provisional ratings
5. The rating system is the **source of truth** for model strength

## Rationale

Separating persistent ratings from temporary tournaments provides the best of both worlds. Ratings accumulate over time, giving a reliable measure of model strength. Tournaments provide structured competition without requiring a complete recalculation every time.
