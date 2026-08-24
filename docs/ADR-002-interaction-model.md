# ADR-002: LLM Interaction Model

## Status

Accepted

## Date

2026-08-24

## Context

LLMs need to interact with the match server. Two options:

- **A:** Native tool/function calling (benchmark runner provides tools)
- **B:** HTTP API URL (LLM makes its own requests)

## Decision

Use **tool/function calling** as the primary interaction model.

### Defined Tools

```
GET_STATE()
  Returns: { fen, turn, legal_moves?, status, history }

MAKE_MOVE(move: string)
  Returns: { accepted, error?, next_turn, status }

SEND_MESSAGE(content: string)
  Returns: { sent: true }

GET_MESSAGES()
  Returns: { messages: [{ sender, content, timestamp }] }

DRAW_OFFER()
  Returns: { sent: true }

RESIGN()
  Returns: { resigned: true }
```

### How It Works

1. Benchmark runner injects tools into the LLM's API call
2. LLM decides which tool to call based on game state
3. Runner executes the tool against the match server
4. Runner returns the result to the LLM
5. LLM processes the result and decides next action

### Why Tool Calling

1. **Universal compatibility** — Works with OpenAI, Anthropic, Google, and most modern LLM APIs
2. **Controlled environment** — The runner mediates all interaction, preventing bypass
3. **Clean separation** — LLM focuses on reasoning, not HTTP mechanics
4. **Measurable** — Each tool call is logged, enabling analysis of decision patterns
5. **Secure** — LLM never sees raw URLs, credentials, or internal server details

## Consequences

1. Each LLM provider needs an adapter that maps provider-specific tool formats to the standard tools
2. The runner must handle tool call parsing, validation, and response formatting
3. Tool call latency is part of the measured response time
4. Models that don't support tool calling cannot participate (by design — this is a capability test)

## Rationale

Tool calling is how modern LLMs are designed to interact with external systems. It provides a clean, secure, and measurable interface while testing the model's actual reasoning capabilities rather than its HTTP construction ability.
