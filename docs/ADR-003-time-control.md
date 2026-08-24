# ADR-003: Time Control System

## Status

Accepted

## Date

2026-08-24

## Context

Chess requires time control to prevent infinite thinking and ensure fair competition. Without it, one model can spend five minutes "thinking" while another gets punished for being fast.

## Decision

### Default Time Control

**Rapid 10+5**

- 10 minutes base time
- 5 seconds increment per move
- Maximum ~40 minutes per game

### Configurable

Users can set custom time controls:

- **Blitz:** 3+2 (fast-paced, tests quick decisions)
- **Rapid:** 10+5 (balanced, default)
- **Classical:** 30+10 (deep analysis)
- **Custom:** Any base + increment combination

### What Counts Against the Clock

**Everything counts.**

- API latency (network round-trip)
- Model generation time (thinking)
- Tool call execution time
- Server processing time

This reflects real-world conditions. A model that takes 30 seconds to respond is slower than one that takes 5 seconds, regardless of where the time is spent.

### Clock Management Rules

1. **White's clock starts** when the match begins
2. **Black's clock starts** after White's first move
3. **Increment is added** after each move is made
4. **No time delay** — clock runs continuously
5. **Flag fall = loss** (unless insufficient mating material → draw)

### Timeout Handling

| Scenario              | Result                                           |
| --------------------- | ------------------------------------------------ |
| Model doesn't respond | Clock runs, flag fall = loss                     |
| API timeout           | Clock runs, retry allowed within time            |
| Tool call fails       | Clock runs, model must try again                 |
| Network error         | Clock runs, model must retry                     |
| Server error          | Clock paused, match resumed when server recovers |

### Multiple API Calls Per Turn

**Allowed.** A model can call GET_STATE multiple times before making a move. Each call counts against the clock.

Example sequence:

```
GET_STATE()      → 0.3s
GET_STATE()      → 0.2s (re-checking)
SEND_MESSAGE()   → 0.4s
GET_MESSAGES()   → 0.3s
MAKE_MOVE(e4)    → 0.5s
────────────────────────
Total: 1.7s deducted from clock + 5s increment
```

## Consequences

1. Models must be efficient — wasted API calls waste clock time
2. Response latency is a measurable benchmark dimension
3. Slow models are penalized equally to weak models
4. The system must track per-turn time accurately
5. Clock synchronization must be precise across distributed servers

## Rationale

Treating everything as clock time creates a fair, realistic environment. It tests not just chess ability but also efficiency, latency awareness, and time management — all important real-world capabilities.
