# ADR-019: Tech Stack

## Status

Accepted

## Date

2026-08-24

## Context

The project needs a complete technology stack for the backend, frontend, database, and tooling. The architecture is a **passive API server** — users bring their own LLM interface (Codex CLI, Open Code, ChatGPT, Claude, etc.) and interact with the benchmark via the provided API.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER'S LLM TOOL                        │
│  (Codex CLI, Open Code, ChatGPT, Claude, custom harness)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Tool calls (GET_STATE, MAKE_MOVE, etc.)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BENCHMARK SERVER                          │
│                    (Passive API)                             │
├─────────────────────────────────────────────────────────────┤
│  ElysiaJS (Node.js) │  chess.js  │  SQLite + Drizzle        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (real-time updates)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEB FRONTEND                             │
│               React + Vite + Custom CSS                     │
└─────────────────────────────────────────────────────────────┘
```

## Decision

### Runtime & Package Manager

| Component       | Choice         | Rationale                                            |
| --------------- | -------------- | ---------------------------------------------------- |
| Runtime         | **Node.js**    | Stable, widely supported, excellent ecosystem        |
| Package Manager | **nub**        | TypeScript-first, fast, pnpm-compatible              |
| Language        | **TypeScript** | Type safety, better DX, catches errors early         |
| Node Version    | **22 LTS**     | Current LTS, great performance and compatibility     |

### Backend

| Component   | Choice            | Rationale                                          |
| ----------- | ----------------- | -------------------------------------------------- |
| Framework   | **ElysiaJS**      | High-performance type-safe router via `@elysiajs/node` |
| Chess Logic | **chess.js**      | Battle-tested, Chess960 support, TypeScript types  |
| Runtime     | **nub**           | TypeScript files run directly on Node.js           |

### Frontend

| Component        | Choice           | Rationale                                          |
| ---------------- | ---------------- | -------------------------------------------------- |
| Framework        | **React 18+**    | Largest ecosystem, most chess components available |
| Build Tool       | **Vite**         | Fastest builds, great DX, native ESM               |
| Styling          | **Custom CSS**   | Lightweight accessible styling (`packages/web/src/index.css`) |
| State Management | **Zustand**      | Simple, lightweight, great for real-time data      |

### Database

| Component  | Choice          | Rationale                                                |
| ---------- | --------------- | -------------------------------------------------------- |
| Database   | **SQLite**      | Simple, file-based, zero config, perfect for self-hosted |
| ORM        | **Drizzle ORM** | Type-safe, SQL-like, lightweight, great DX               |
| Migrations | **Drizzle Kit** | Built-in migration tool                                  |

### Real-Time

| Component      | Choice            | Rationale                                 |
| -------------- | ----------------- | ----------------------------------------- |
| Protocol       | **WebSocket**     | Full control, low overhead, bidirectional |
| Implementation | **Hono WebSocket**| Native support, no extra dependencies     |

### Testing

| Component        | Choice         | Rationale                               |
| ---------------- | -------------- | --------------------------------------- |
| Unit/Integration | **Vitest**     | Fast, Vite-native, TypeScript-first     |
| E2E              | **Playwright** | Best browser automation, visual testing |
| API Testing      | **Supertest**  | Simple HTTP assertions                  |

### Deployment

| Component      | Choice             | Rationale                           |
| -------------- | ------------------ | ----------------------------------- |
| Container      | **Docker**         | Consistent environment, isolated    |
| Orchestration  | **Docker Compose** | Simple multi-service setup          |
| Hosting Option | **Vercel**         | Easy deployment, serverless support |

### Tooling

| Component | Choice                  | Rationale                        |
| --------- | ----------------------- | -------------------------------- |
| Linter    | **Oxc**                 | Fast, recommended rules, Rust-based |
| Formatter | **dprint**              | Fast, TypeScript-first           |
| Git Hooks | **Husky + lint-staged** | Pre-commit checks                |
| CI/CD     | **GitHub Actions**      | Standard, free for open source   |

## Project Structure

```
llm-chess-arena/
├── packages/
│   ├── server/              # Hono backend
│   │   ├── src/
│   │   │   ├── api/         # REST endpoints
│   │   │   ├── ws/          # WebSocket handlers
│   │   │   ├── chess/       # Chess logic wrappers
│   │   │   ├── game/        # Game state management
│   │   │   ├── tournament/  # Tournament logic
│   │   │   ├── evaluation/  # Metrics and rating
│   │   │   └── db/          # Drizzle schema + migrations
│   │   └── package.json
│   ├── web/                 # React frontend
│   │   ├── src/
│   │   │   ├── components/  # UI components
│   │   │   ├── pages/       # Route pages
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── stores/      # Zustand stores
│   │   │   └── lib/         # Utilities
│   │   └── package.json
│   └── shared/              # Shared types and utils
│       ├── src/
│       │   ├── types/       # TypeScript types
│       │   ├── constants/   # Shared constants
│       │   └── utils/       # Shared utilities
│       └── package.json
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── docs/                    # ADRs and documentation
├── .node-version            # Node.js 22
├── oxlint.json              # Oxc linter config
├── dprint.json              # dprint formatter config
├── package.json             # Workspace root
└── README.md
```

## Key APIs

### REST Endpoints

```
POST   /api/match/create        # Create a new match
GET    /api/match/:id           # Get match details
GET    /api/match/:id/state     # Get current game state
POST   /api/match/:id/move      # Submit a move
POST   /api/match/:id/message   # Send a message
GET    /api/match/:id/messages  # Get messages
POST   /api/match/:id/draw      # Offer/accept draw
POST   /api/match/:id/resign    # Resign
GET    /api/tournament          # Get tournament standings
GET    /api/models              # List registered models
```

### WebSocket Events

```
→ Client: { type: "subscribe", matchId: "..." }
← Server: { type: "state_update", ... }
← Server: { type: "move_made", ... }
← Server: { type: "message_received", ... }
← Server: { type: "clock_update", ... }
← Server: { type: "game_over", ... }
```

### Tool Definitions (for LLM prompt)

```json
{
  "tools": [
    {
      "name": "GET_STATE",
      "description": "Retrieve the current game state",
      "parameters": {}
    },
    {
      "name": "MAKE_MOVE",
      "description": "Submit a chess move",
      "parameters": {
        "move": {
          "type": "string",
          "description": "Chess move in algebraic notation"
        }
      }
    },
    {
      "name": "SEND_MESSAGE",
      "description": "Send a message to your opponent",
      "parameters": {
        "content": { "type": "string", "description": "Message content" }
      }
    },
    {
      "name": "GET_MESSAGES",
      "description": "Retrieve messages from your opponent",
      "parameters": {}
    },
    {
      "name": "DRAW_OFFER",
      "description": "Offer a draw to your opponent",
      "parameters": {}
    },
    {
      "name": "RESIGN",
      "description": "Resign the game",
      "parameters": {}
    }
  ]
}
```

## Consequences

1. **Node.js + Hono** provides a lightweight, fast backend
2. **nub** provides fast TypeScript execution and package management
3. **React + Vite + shadcn/ui** provides a beautiful, accessible frontend
4. **SQLite + Drizzle** provides simple, type-safe data storage
5. **WebSocket** provides real-time updates without extra dependencies
6. **chess.js** provides battle-tested chess logic
7. **Vitest + Playwright** provides comprehensive testing
8. **Docker** ensures consistent deployment across environments
9. **Oxc + dprint** provides fast linting and formatting

## Rationale

This tech stack is optimized for:

- **Stability** — Node.js is battle-tested, widely supported
- **Developer experience** — TypeScript everywhere, great tooling with nub
- **Performance** — Hono is lightweight, Vite is fast
- **Simplicity** — SQLite requires no setup, Docker ensures consistency
- **Type safety** — Drizzle ORM + TypeScript catches errors early
- **Self-hosted** — Users can run everything locally with minimal setup
