# Shared Context

## Overview

The shared package contains types, constants, and utilities used by both server and web packages.

## Structure

- `src/types/` — TypeScript type definitions
- `src/constants/` — Shared constants
- `src/utils/` — Shared utilities

## Key Types

| Type | Description |
|------|-------------|
| Match | Match configuration and state |
| Game | Game configuration and state |
| Event | Immutable event record |
| Player | Player identification and config |
| ModelConfig | LLM provider configuration |
| Rating | Glicko-2 rating data |
| Tournament | Tournament configuration |
| MatchManifest | Reproducibility manifest |

## Key Constants

| Constant | Description |
|----------|-------------|
| ERROR_CODES | API error codes |
| TIME_CONTROLS | Available time controls |
| GAME_MODES | Standard, Chess960 |
| BOARD_MODES | Pure, Assisted |
| LIMITS | Token/API call budgets |

## Glossary

| Term | Definition |
|------|------------|
| ModelConfig | Configuration for an LLM provider |
| MatchManifest | Complete record for reproducing a match |
| Glicko-2 | Rating system with uncertainty (RD) |

## ADRs

See `docs/adr/` for system-wide decisions.
