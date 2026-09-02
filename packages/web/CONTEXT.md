# Web Context

## Overview

The web package is the frontend for the LLM Chess Arena. It provides the spectator interface for watching live matches, viewing leaderboards, and replaying games.

## Tech Stack

- **Framework**: React 18+
- **Build Tool**: Vite
- **UI Library**: Custom CSS (packages/web/src/index.css)
- **State Management**: Zustand
- **Testing**: Vitest + React Testing Library

## Key Modules

- `src/components/` — UI components
- `src/pages/` — Route pages
- `src/hooks/` — Custom React hooks
- `src/stores/` — Zustand stores
- `src/lib/` — Utilities

## Pages

| Page | Route | Description |
|------|-------|-------------|
| Arena | `/` | Live match view |
| Dashboard | `/dashboard` | Leaderboard, ratings, standings |
| Replay | `/replay/:matchId/:gameId` | Game replay |
| Admin | `/admin` | Match creation, model management |

## Glossary

| Term | Definition |
|------|------------|
| Arena | The live match spectator view |
| Dashboard | Tournament standings and leaderboard |
| Replay | Move-by-move game review |

## ADRs

See `docs/adr/` for system-wide decisions.
