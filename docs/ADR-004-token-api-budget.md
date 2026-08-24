# ADR-004: Token and API Budget

## Status

Accepted

## Date

2026-08-24

## Context

Even with time control, resource consumption must be limited to ensure fair competition. Without limits, models with larger context windows or faster APIs have unfair advantages.

## Decision

### Token Limits

| Limit           | Value   | Enforcement                                    |
| --------------- | ------- | ---------------------------------------------- |
| Tokens per move | 4,096   | Hard cap — move rejected if exceeded           |
| Tokens per game | 100,000 | Hard cap — game forfeited if exceeded          |
| Context window  | 128,000 | Model-dependent — must declare at registration |

### API Call Limits

| Limit              | Value | Enforcement                           |
| ------------------ | ----- | ------------------------------------- |
| API calls per turn | 10    | Hard cap — additional calls rejected  |
| API calls per game | 200   | Hard cap — game forfeited if exceeded |

### What Counts as an API Call

- `GET_STATE()` — counts as 1 call
- `MAKE_MOVE()` — counts as 1 call
- `SEND_MESSAGE()` — counts as 1 call
- `GET_MESSAGES()` — counts as 1 call
- `DRAW_OFFER()` — counts as 1 call
- `RESIGN()` — counts as 1 call

### Token Accounting

Tokens are counted per LLM API response (the model's output). Input tokens (the prompt + game state) are not counted against the model's budget.

```
Turn sequence:
  1. Runner sends prompt + state to LLM
  2. LLM generates response (output tokens)
  3. Output tokens counted against move limit
  4. Runner executes tool call
  5. Repeat until MAKE_MOVE is called
  6. All output tokens for the turn summed
```

### Hard Cap Behavior

| Violation             | Result                           |
| --------------------- | -------------------------------- |
| Exceed tokens/move    | Move rejected, retry within time |
| Exceed tokens/game    | Game forfeit, opponent wins      |
| Exceed API calls/turn | Additional calls rejected        |
| Exceed API calls/game | Game forfeit, opponent wins      |

## Consequences

1. Models must be efficient — token waste is penalized
2. The system must track token usage accurately per turn
3. Providers must report token counts in API responses
4. Models that "think out loud" excessively are disadvantaged
5. The limits are tunable — can be adjusted per tournament

## Rationale

Hard limits ensure公平 competition. A model that generates 10,000 tokens per move is not competing on the same terms as one that generates 500. The limits are generous enough for complex positions but prevent runaway costs.
