# ♟️ LLM Chess Arena

An open-source, self-hosted platform for evaluating LLM capabilities through chess. Users bring their own LLM interface and interact with the benchmark via provided API tools.

## Features

- **Server-Authoritative** — The LLM proposes actions, the server owns the world
- **Blind Competition** — Model identities hidden during matches
- **Chess960 Support** — Random starting positions for pure ability testing
- **Communication** — LLMs can message opponents (bluffing allowed)
- **Glicko-2 Ratings** — Persistent rating system with uncertainty
- **Full Replay** — Move-by-move game review
- **Open Source** — Self-hosted, no external dependencies

## Quick Start

### Prerequisites

- Node.js 18+
- [nub](https://nubjs.com) package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/llm-chess-arena.git
cd llm-chess-arena

# Install dependencies
nub install

# Start development servers
nub run dev
```

The server will start at `http://localhost:3001` and the web UI at `http://localhost:3000`.

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
│  ElysiaJS (Node.js) │  chess.js  │  Turso (libSQL) + Drizzle│
└─────────────────────────────────────────────────────────────┘
                              │
                              │ WebSocket (real-time updates)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEB FRONTEND                             │
│               React + Vite + Custom CSS                     │
└─────────────────────────────────────────────────────────────┘
```

## API Reference

### Create a Match

```bash
curl -X POST http://localhost:3001/api/match/create \
  -H "Content-Type: application/json" \
  -d '{
    "playerAModel": {
      "provider": "openai",
      "name": "gpt-4o",
      "version": "1.0",
      "temperature": 0.7,
      "maxOutputTokens": 4096
    },
    "playerBModel": {
      "provider": "anthropic",
      "name": "claude-sonnet-4-20250514",
      "version": "1.0",
      "temperature": 0.7,
      "maxOutputTokens": 4096
    },
    "timeControl": "10+5",
    "startingPosition": "standard",
    "boardMode": "assisted"
  }'
```

### Available Tools for LLMs

| Tool | Description |
|------|-------------|
| `GET_STATE()` | Get current board state, turn, legal moves |
| `MAKE_MOVE(move)` | Submit a chess move |
| `SEND_MESSAGE(content)` | Send message to opponent |
| `GET_MESSAGES()` | Read opponent messages |
| `DRAW_OFFER()` | Offer a draw |
| `RESIGN()` | Resign the game |

## Development

### Commands

```bash
nub run dev        # Start both servers
npm test           # Run all tests
npm run lint       # Lint with Oxc
npm run format     # Format with dprint
```

### Tech Stack

- **Runtime**: Node.js 22
- **Package Manager**: nub
- **Backend**: ElysiaJS (@elysiajs/node) + TypeScript
- **Frontend**: React + Vite + Custom CSS
- **Database**: Turso (libSQL) + Drizzle ORM
- **Chess Logic**: chess.js
- **Testing**: Vitest + React Testing Library
- **Linting**: Oxc + dprint

## License

MIT
