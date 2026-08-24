# ADR-012: Anti-Cheating / Tool Policy

## Status

Accepted

## Date

2026-08-24

## Context

Without clear rules on external tools, you're comparing "LLM + Stockfish + Google" against "LLM sitting alone in a room." This is technically a competition and practically nonsense.

## Decision

**Closed Division Only.** No external tools allowed. Pure LLM ability.

### Prohibited Tools

| Tool                           | Allowed? | Reason                                         |
| ------------------------------ | -------- | ---------------------------------------------- |
| Chess engine (Stockfish, etc.) | ❌       | Tests LLM chess ability, not engine assistance |
| Internet browsing              | ❌       | Prevents external information retrieval        |
| Other LLMs                     | ❌       | Prevents model collaboration                   |
| Tournament API inspection      | ❌       | Prevents server metadata access                |
| Other match access             | ❌       | Prevents cross-match information               |
| External memory/databases      | ❌       | Tests LLM memory, not external storage         |
| Code execution                 | ❌       | Prevents arbitrary computation                 |
| File system access             | ❌       | Prevents local data retrieval                  |

### What IS Allowed

| Tool                          | Allowed? | Reason                     |
| ----------------------------- | -------- | -------------------------- |
| Match tools (GET_STATE, etc.) | ✅       | Core interface             |
| Internal reasoning            | ✅       | This is what we're testing |
| Conversation history          | ✅       | Part of the match context  |

### Enforcement

1. **Tool restriction** — Only match tools are provided to the LLM
2. **API isolation** — LLM API calls go through the benchmark runner only
3. **No raw URLs** — LLM never sees external endpoints
4. **Prompt restrictions** — Instructions explicitly prohibit external tool use
5. **Post-game analysis** — Review tool call patterns for anomalies

### What We're NOT Doing

- **Runtime monitoring** — We don't monitor the LLM's internal state
- **Network restrictions** — We can't control what the LLM provider does
- **Provenance tracking** — We don't verify the LLM's training data

The enforcement is **practical, not absolute**. We restrict what we can control (the tool interface) and document what we can't.

### Future: Open Division

The architecture supports adding an Open Division later:

- Define allowed tools per tournament
- Set tool budgets (e.g., 5 web searches per game)
- Track tool usage in event logs
- Compare Closed vs Open performance

This is deferred to future versions.

## Consequences

1. The benchmark runner must be the sole interface to the LLM
2. LLM providers must support tool restriction (most do)
3. The prompt must explicitly prohibit external tools
4. Post-game analysis can detect suspicious patterns
5. The Closed Division is the **default and only** division in v1

## Rationale

Closed division ensures the benchmark measures LLM ability, not tool-assisted performance. It's the fairest, simplest, and most meaningful comparison. External tools can be added later as a separate division without changing the core benchmark.
