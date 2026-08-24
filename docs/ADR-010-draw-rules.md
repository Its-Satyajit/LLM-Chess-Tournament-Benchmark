# ADR-010: Draw Rules

## Status

Accepted

## Date

2026-08-24

## Context

Chess has many ways to draw. Rules must be explicit to prevent confusion and ensure fair outcomes.

## Decision

### Automatic Draws (Server-Enforced)

| Condition             | Rule                               | Result        |
| --------------------- | ---------------------------------- | ------------- |
| Stalemate             | No legal moves, not in check       | Draw          |
| Threefold repetition  | Same position 3 times              | Draw (auto)   |
| 50-move rule          | 50 moves without capture/pawn      | Draw (auto)   |
| 75-move rule          | 75 moves without capture/pawn      | Draw (forced) |
| Insufficient material | K vs K, K+B vs K, K+N vs K         | Draw          |
| Dead position         | No sequence of moves can checkmate | Draw          |

### Player-Initiated Actions

#### Draw Offer (DRAW_OFFER tool)

- Either player can offer a draw
- **Mutual agreement required** — opponent must accept
- If rejected, cannot offer again for **10 moves**
- Draw offer counts as a turn (clock continues)
- Opponent can accept immediately or play on

#### Draw Offer Flow

```
Player A: DRAW_OFFER()
  → Server sends draw offer to Player B
  → Player A's turn ends

Player B: GET_MESSAGES() → sees draw offer
  → Player B can:
    a) Accept → Game ends in draw
    b) Reject → Game continues, Player A cannot offer for 10 moves
    c) Ignore → Game continues, offer remains pending
```

#### Resignation (RESIGN tool)

- Either player can resign at any time
- Resignation is immediate and irrevocable
- Game ends with opponent as winner
- Resignation counts as a turn

### Timeout vs Insufficient Material

| Scenario                                           | Result                                      |
| -------------------------------------------------- | ------------------------------------------- |
| Player A flags, Player B has sufficient material   | A loses                                     |
| Player A flags, Player B has insufficient material | Draw                                        |
| Both players flag                                  | Draw (unless one has insufficient material) |

### Draw by Agreement During Play

If both players signal draw interest in the same turn cycle:

1. Server detects mutual draw interest
2. Server confirms with both players
3. Game ends in draw

### Claiming Draws

Players can **claim** draws (not just offer):

- Threefold repetition → Player claims, server verifies
- 50-move rule → Player claims, server verifies
- Insufficient material → Player claims, server verifies

Claims require server verification to prevent false claims.

## Consequences

1. The server must implement draw detection logic
2. Draw offer state must be tracked (pending, accepted, rejected)
3. The 10-move cooldown must be enforced
4. Insufficient material detection must be accurate
5. The draw system is a **hard contract** — all games follow these rules

## Rationale

Explicit draw rules prevent confusion and ensure fair outcomes. Mutual agreement draw offers test strategic decision-making — when to concede, when to push for a win. The 10-move cooldown prevents draw spam while allowing legitimate offers.
