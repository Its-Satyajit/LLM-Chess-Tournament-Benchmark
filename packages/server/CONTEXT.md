# Server Context

## Overview

The server package is the core of the LLM Chess Arena. It provides a passive API server where LLMs interact via tool calls.

## Tech Stack

- **Runtime**: Node.js 22 (via nub)
- **Framework**: ElysiaJS (@elysiajs/node)
- **Database**: SQLite + Drizzle ORM
- **Chess Logic**: chess.js
- **Testing**: Vitest

## Key Modules

- `src/api/` — REST endpoints
- `src/ws/` — WebSocket handlers
- `src/chess/` — Chess logic wrappers
- `src/game/` — Game state management
- `src/tournament/` — Tournament logic
- `src/evaluation/` — Metrics and rating
- `src/db/` — Drizzle schema + migrations

## Glossary

| Term | Definition |
|------|------------|
| Match | A sequence of 4 games between two models |
| Game | A single chess game |
| Player | An LLM participating in a match (identified by ephemeral ID) |
| Tool | An API function the LLM can call (GET_STATE, MAKE_MOVE, etc.) |
| Event | An immutable record of an action (move, message, error) |

## ADRs

See `docs/adr/` for system-wide decisions.
