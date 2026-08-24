# ADR-005: Information Visibility Matrix

## Status

Accepted

## Date

2026-08-24

## Context

The LLM must know enough to play chess but not enough to game the system or gain unfair advantages. Information asymmetry must be carefully controlled.

## Decision

### Visibility Matrix

| Information           | Visible | Notes                         |
| --------------------- | ------- | ----------------------------- |
| Player ID             | ✅      | `P-A7K29X`                    |
| Color assignment      | ✅      | White or Black                |
| Current turn          | ✅      | Whose move it is              |
| FEN                   | ✅      | Board position                |
| Legal moves           | ✅      | In Assisted mode only         |
| Own clock             | ✅      | Time remaining                |
| Own messages          | ✅      | Messages sent                 |
| Opponent messages     | ✅      | Messages received             |
| Game status           | ✅      | active, checkmate, draw, etc. |
| Move history          | ✅      | All moves played              |
|                       |         |                               |
| Tournament name       | ❌      | Hidden                        |
| Round number          | ❌      | Hidden                        |
| Game number           | ❌      | Hidden                        |
| Own Elo rating        | ❌      | Hidden                        |
| Opponent Elo          | ❌      | Hidden                        |
| Opponent model family | ❌      | Hidden                        |
| Opponent identity     | ❌      | Hidden                        |
| Tournament standings  | ❌      | Hidden                        |
| Previous games        | ❌      | Hidden                        |
| Number of spectators  | ❌      | Hidden                        |
| Opponent clock        | ❌      | Hidden                        |
| Server metadata       | ❌      | Hidden                        |

### Rationale for Hidden Information

1. **Tournament context** — Prevents models from adjusting strategy based on standings ("I'm winning, play safe" or "I'm losing, play aggressive")
2. **Elo ratings** — Prevents models from sandbagging or adjusting play based on perceived opponent strength
3. **Opponent details** — Prevents models from exploiting known weaknesses of specific opponents
4. **Game number** — Prevents fatigue-based strategy adjustments
5. **Spectators** — Prevents performance anxiety or showboating

### What the Model Sees

```json
{
  "player": {
    "id": "P-A7K29X",
    "color": "white"
  },
  "game": {
    "status": "active",
    "turn": "white",
    "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1",
    "legal_moves": ["e5", "d5", "Nf6", "Nc6"],
    "history": ["e4"],
    "clock": {
      "white": 587,
      "black": 600
    }
  },
  "messages": []
}
```

### Exception: Post-Match Reveal

After a match completes, the system **may** reveal:

- Opponent identity
- Tournament context
- Elo ratings

This depends on tournament configuration. The default is **no reveal** to prevent pattern learning across matches.

## Consequences

1. The model plays in information isolation — pure chess + communication
2. Strategy cannot be influenced by tournament context
3. The model must play consistently regardless of opponent strength
4. Post-match analysis can reveal identities for human researchers
5. The visibility matrix is a **hard contract** — never leak hidden info

## Rationale

Minimal information creates the purest benchmark. The model must succeed based on chess ability and communication strategy alone, not on contextual awareness or opponent profiling.
