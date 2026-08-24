# ADR-013: Error Handling

## Status

Accepted

## Date

2026-08-24

## Context

Error handling must be explicit and consistent. The most critical decision is how to handle illegal moves — it significantly affects game outcomes and benchmark metrics.

## Decision

### Illegal Move Handling

**Retry within time.**

- Illegal move is rejected
- Model can try again within remaining clock time
- Each illegal move is logged as a benchmark event
- The event is a valuable metric for evaluation

### Illegal Move Event

```json
{
  "event": "illegal_move",
  "move": "e5",
  "error": "ILLEGAL_MOVE",
  "reason": "Pawn cannot move two squares from e4 (blocked)",
  "timestamp": "...",
  "turn": 12,
  "player": "P-A7K29X"
}
```

### Illegal Move Metrics

| Metric                    | Description                     |
| ------------------------- | ------------------------------- |
| Illegal move rate         | Illegal moves / total moves     |
| Illegal moves per game    | Average per game                |
| Illegal move recovery     | % of games where model recovers |
| Illegal move clusters     | Consecutive illegal moves       |
| Position-dependent errors | Which positions cause errors    |

### All Error Scenarios

| Error                    | Handling                       | Game Impact   |
| ------------------------ | ------------------------------ | ------------- |
| Illegal move             | Reject, retry within time      | Clock runs    |
| Malformed JSON           | Reject, retry within time      | Clock runs    |
| Unknown API call         | Reject, retry within time      | Clock runs    |
| Repeated move submission | Reject, retry within time      | Clock runs    |
| API timeout              | Retry automatically            | Clock runs    |
| Model timeout            | Clock runs, flag fall possible | Clock runs    |
| Empty response           | Reject, retry within time      | Clock runs    |
| Server error             | Pause clock, retry             | Clock paused  |
| Authentication failure   | Match cancelled                | No impact     |
| Rate limit               | Reject, retry within time      | Clock runs    |
| Model unavailable        | Match forfeit                  | Opponent wins |

### Retry Rules

1. **Unlimited retries** within time — model can keep trying until clock runs out
2. **Error feedback** — model receives specific error message
3. **Error count logged** — every error is tracked
4. **No penalty beyond time** — errors don't add extra penalties

### Error Feedback Format

```json
{
  "error": true,
  "code": "ILLEGAL_MOVE",
  "message": "The move e5 is not legal in the current position.",
  "suggestion": "Use GET_STATE() to retrieve the current board state."
}
```

### Clock Pausing

The clock is **only paused** for:

- Server errors (not the model's fault)
- Authentication failures (not the model's fault)
- Match initialization

Everything else runs the clock, including:

- Network latency
- API timeouts
- Model thinking time
- Error retries

## Consequences

1. The server must implement detailed error detection
2. Error events must be logged for benchmark analysis
3. The error feedback must be helpful but not give away the answer
4. Models that make many illegal moves are penalized by time, not by规则
5. The error handling system is a **hard contract** — all games follow these rules

## Rationale

Retry within time is the fairest approach. It tests error recovery — a valuable real-world capability. Illegal move events become a rich metric for evaluating LLM chess understanding. The clock penalty ensures models are incentivized to be correct, without harsh disqualification for occasional mistakes.
