# LLM Chess Arena — Technical Spec

## Problem Statement

Researchers and developers need a standardized, reproducible way to evaluate LLM capabilities through chess. Current approaches either focus solely on "who wins" (tournament) or lack the rich behavioral data needed to understand "why/how it played" (benchmark). There is no open-source, self-hosted platform that provides both competitive outcomes and diagnostic behavioral analysis in a single system.

## Solution

Build an open-source, self-hosted **LLM Chess Arena** — a passive API server where LLMs compete in chess matches. Users bring their own LLM interface (Codex CLI, Open Code, ChatGPT, Claude, etc.) and interact with the benchmark via provided API tools. The system records every action, enabling both tournament rankings (Glicko-2 Elo) and deep behavioral analysis (reasoning, communication, error recovery).

## User Stories

### Core Match Flow

1. As a **tournament organizer**, I want to create a match between two models, so that they can compete under controlled conditions.
2. As a **tournament organizer**, I want to assign colors (White/Black) to each player, so that the match is fair.
3. As a **tournament organizer**, I want to choose between Standard Chess and Chess960 starting positions, so that I can test different capabilities.
4. As a **tournament organizer**, I want to set time controls (e.g., 10+5), so that matches have reasonable duration.
5. As a **tournament organizer**, I want to choose between Pure Chess mode (no legal moves provided) and Assisted mode (legal moves included), so that I can focus on different aspects.

### LLM Interaction

6. As an **LLM user**, I want to receive a prompt with my player ID and available tools, so that I can participate in the match.
7. As an **LLM user**, I want to call GET_STATE() to retrieve the current board position, turn, and clock, so that I can make informed decisions.
8. As an **LLM user**, I want to call MAKE_MOVE(move) to submit a chess move, so that I can play the game.
9. As an **LLM user**, I want to receive clear error messages when I submit an illegal move, so that I can retry within my clock time.
10. As an **LLM user**, I want to call SEND_MESSAGE(content) to communicate with my opponent, so that I can engage in psychological tactics.
11. As an **LLM user**, I want to call GET_MESSAGES() to read opponent messages, so that I can respond to their communication.
12. As an **LLM user**, I want to call DRAW_OFFER() to propose a draw, so that I can strategically concede when appropriate.
13. As an **LLM user**, I want to call RESIGN() to concede the game, so that I can accept defeat gracefully.
14. As an **LLM user**, I want to see my remaining clock time, so that I can manage my time effectively.
15. As an **LLM user**, I want to make multiple API calls per turn (e.g., GET_STATE several times), so that I can verify my understanding before committing to a move.

### Communication

16. As an **LLM user**, I want to send messages to my opponent at any time (my turn or not), so that I can engage in real-time communication.
17. As an **LLM user**, I want messages to be delivered immediately, so that the conversation flows naturally.
18. As an **LLM user**, I want to be allowed to bluff or mislead in messages, so that the benchmark tests strategic communication.
19. As a **tournament organizer**, I want communication to be optional, so that models that don't communicate are still comparable.

### Game Rules

20. As a **tournament organizer**, I want the server to detect stalemate and declare a draw, so that games end correctly.
21. As a **tournament organizer**, I want the server to detect threefold repetition and declare a draw, so that infinite loops are prevented.
22. As a **tournament organizer**, I want the server to enforce the 50-move rule, so that games don't continue indefinitely.
23. As a **tournament organizer**, I want the server to detect insufficient material and declare a draw, so that unwinable positions are handled.
24. As an **LLM user**, I want to offer a draw via DRAW_OFFER(), and have my opponent accept or reject, so that we can agree to a draw.
25. As an **LLM user**, I want rejected draw offers to have a 10-move cooldown, so that draw spam is prevented.
26. As an **LLM user**, I want to resign at any time via RESIGN(), so that I can concede immediately.

### Time Control

27. As a **tournament organizer**, I want a default time control of Rapid 10+5, so that matches are balanced.
28. As a **tournament organizer**, I want to configure custom time controls (Blitz, Rapid, Classical), so that I can run different tournament formats.
29. As a **tournament organizer**, I want all API latency, generation time, and tool call time to count against the clock, so that the benchmark reflects real-world conditions.
30. As a **tournament organizer**, I want the clock to flag-fall on timeout (loss), unless insufficient material (draw), so that games have definite endings.

### Match Structure

31. As a **tournament organizer**, I want 4 games per pairing (2 Standard, 2 Chess960, each color once), so that results are statistically robust.
32. As a **tournament organizer**, I want a 30-second reset period between games, so that players can prepare for the next game.
33. As a **tournament organizer**, I want each game to use a fresh prompt with new player IDs, so that models can't learn from previous games.

### Token & API Budget

34. As a **tournament organizer**, I want a hard limit of 4,096 tokens per move, so that models can't generate excessive output.
35. As a **tournament organizer**, I want a hard limit of 100,000 tokens per game, so that total reasoning budget is capped.
36. As a **tournament organizer**, I want a hard limit of 10 API calls per turn, so that models can't spam GET_STATE.
37. As a **tournament organizer**, I want a hard limit of 200 API calls per game, so that total interaction budget is capped.

### Information Visibility

38. As a **tournament organizer**, I want the LLM to see only: player ID, color, turn, FEN, legal moves (Assisted mode), own clock, own messages, opponent messages, game status, and move history — so that the benchmark tests pure chess ability without contextual advantages.
39. As a **tournament organizer**, I want the LLM to NOT see: tournament name, round number, game number, own Elo, opponent Elo, opponent identity, tournament standings, previous games, number of spectators, or opponent clock — so that context doesn't influence play.

### Error Handling

40. As a **tournament organizer**, I want illegal moves to be rejected with a clear error message, and the model to retry within its clock time, so that error recovery is tested.
41. As a **tournament organizer**, I want malformed JSON, unknown API calls, and repeated move submissions to be rejected with clear errors, so that the model can correct itself.
42. As a **tournament organizer**, I want every error event to be logged, so that error patterns can be analyzed as benchmark metrics.
43. As a **tournament organizer**, I want the clock to only pause for server errors (not model errors), so that models are incentivized to be correct.

### Security

44. As a **tournament organizer**, I want per-player JWT tokens scoped to a single match, so that cross-match access is prevented.
45. As a **tournament organizer**, I want rate limiting (10 requests/second, 20 requests/turn), so that DoS is prevented.
46. As a **tournament organizer**, I want every request to be validated (auth, authorization, match context, turn order, rate limit, schema), so that the API is zero-trust.
47. As a **tournament organizer**, I want the LLM to never see raw URLs, credentials, or internal server details, so that security is maintained.

### Tournament & Rating

48. As a **tournament organizer**, I want to run Round Robin tournaments (everyone plays everyone), so that rankings are fair.
49. As a **tournament organizer**, I want Glicko-2 ratings that persist across tournaments, so that model strength is tracked over time.
50. As a **tournament organizer**, I want new models to start with provisional ratings (e.g., 1500), so that they can be ranked after sufficient games.

### Evaluation & Metrics

51. As a **tournament organizer**, I want to see Glicko-2 Elo ratings for each model, so that I know relative strength.
52. As a **tournament organizer**, I want to see diagnostic metrics: win rate, draw rate, illegal move rate, average response time, blunder rate, tactical accuracy, communication statistics — so that I understand how models play, not just whether they win.
53. As a **tournament organizer**, I want metrics presented multi-dimensionally (not a single composite score), so that I can compare models across multiple axes.

### Web Interface

54. As a **spectator**, I want to see a live chessboard with real-time updates, so that I can watch matches as they happen.
55. As a **spectator**, I want to see move history, messages, and clock updates in real-time, so that I can follow the game flow.
56. As a **spectator**, I want to see a tournament leaderboard with ratings and standings, so that I can track tournament progress.
57. As a **spectator**, I want to replay completed games move-by-move, so that I can analyze past matches.
58. As a **spectator**, I want to see model identities revealed post-match (configurable), so that I know who played.

### Reproducibility

59. As a **researcher**, I want a complete match manifest (seed, config, prompt version, rules version), so that I can reproduce the exact same match.
60. As a **researcher**, I want Chess960 positions to be generated deterministically from a seed, so that starting positions are reproducible.
61. As a **researcher**, I want the prompt template to be versioned, so that I can track how instructions change over time.

### Benchmark Integrity

62. As a **tournament organizer**, I want randomized starting positions (Chess960), so that models can't memorize specific openings.
63. As a **tournament organizer**, I want match-specific player IDs, so that models can't learn opponent patterns.
64. As a **tournament organizer**, I want some matches to be private (not publicly visible), so that benchmark positions aren't published.

### Model Configuration

65. As a **researcher**, I want to record full model configuration (provider, version, temperature, max tokens, etc.) for every match, so that results are reproducible.
66. As a **researcher**, I want to import model configurations from Codex CLI, Open Code, and chat apps, so that real-world configs are used.
67. As a **researcher**, I want model configurations to be immutable (new config = new model entry), so that historical results are preserved.

### Deployment

68. As a **user**, I want to clone the repo, install dependencies, and run the server with Docker, so that setup is simple.
69. As a **user**, I want the option to deploy to Vercel, so that I can host the web frontend easily.
70. As a **user**, I want the benchmark to be fully self-hosted with no external dependencies, so that I have complete control.

## Implementation Decisions

### Architecture: Passive API Server

The benchmark is a **passive API server**. Users bring their own LLM interface (Codex CLI, Open Code, ChatGPT, Claude, etc.) and interact with the benchmark via the provided API tools. No LLM SDKs are needed — the server only provides REST/WebSocket endpoints.

```
User's LLM Tool → Benchmark Server → WebSocket → Web Frontend
```

### Tech Stack

| Component          | Choice                      |
| ------------------ | --------------------------- |
| Runtime            | NodeJS                      |
| Package Manager    | nubjs                       |
| Language           | TypeScript                  |
| Backend Framework  | ElysiaJS                    |
| Frontend Framework | React + Vite                |
| UI Library         | shadcn/ui + Tailwind CSS    |
| State Management   | Zustand                     |
| Database           | SQLite                      |
| ORM                | Drizzle ORM                 |
| Chess Logic        | chess.js                    |
| Real-Time          | WebSocket (ElysiaJS native) |
| Testing            | Vitest + Playwright         |
| Deployment         | Docker + Vercel option      |
| Linting            | Biome                       |
| CI/CD              | GitHub Actions              |

### Project Structure

```
llm-chess-arena/
├── packages/
│   ├── server/              # ElysiaJS backend
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
├── NodeJS.lockb
├── NodeJSfig.toml
├── package.json             # Workspace root
└── README.md
```

### Data Model

#### Tables

**matches**

- id: TEXT PRIMARY KEY (MATCH-YYYY-MM-DD-XXXXXX)
- player_a_id: TEXT (P-XXXXXX)
- player_b_id: TEXT (P-XXXXXX)
- player_a_model: TEXT (model config JSON)
- player_b_model: TEXT (model config JSON)
- status: TEXT (pending | active | completed)
- time_control: TEXT (10+5)
- starting_position: TEXT (standard | chess960)
- chess960_seed: INTEGER | NULL
- board_mode: TEXT (pure | assisted)
- created_at: TIMESTAMP
- completed_at: TIMESTAMP | NULL

**games**

- id: TEXT PRIMARY KEY (GAME-YYYY-MM-DD-XXXXXX)
- match_id: TEXT REFERENCES matches(id)
- game_number: INTEGER (1-4)
- white_player_id: TEXT
- black_player_id: TEXT
- status: TEXT (pending | active | completed)
- result: TEXT (white_win | black_win | draw | white_forfeit | black_forfeit)
- result_reason: TEXT (checkmate | stalemate | repetition | 50_move | insufficient | timeout | resign | draw_offer)
- fen_initial: TEXT
- fen_final: TEXT | NULL
- move_count: INTEGER
- created_at: TIMESTAMP
- completed_at: TIMESTAMP | NULL

**events**

- id: INTEGER PRIMARY KEY AUTOINCREMENT
- game_id: TEXT REFERENCES games(id)
- event_type: TEXT (move | message | state_read | draw_offer | draw_accept | draw_reject | resign | illegal_move | error)
- player_id: TEXT
- data: TEXT (JSON event payload)
- timestamp: TIMESTAMP
- game_move: INTEGER | NULL
- clock_white: INTEGER | NULL
- clock_black: INTEGER | NULL

**ratings**

- model_name: TEXT PRIMARY KEY
- provider: TEXT
- glicko_rating: REAL (default 1500)
- glicko_rd: REAL (default 350)
- glicko_volatility: REAL (default 0.06)
- games_played: INTEGER (default 0)
- last_updated: TIMESTAMP

**tournaments**

- id: TEXT PRIMARY KEY
- name: TEXT
- format: TEXT (round_robin | swiss | knockout)
- status: TEXT (pending | active | completed)
- created_at: TIMESTAMP
- completed_at: TIMESTAMP | NULL

**tournament_entries**

- id: INTEGER PRIMARY KEY AUTOINCREMENT
- tournament_id: TEXT REFERENCES tournaments(id)
- model_name: TEXT
- provider: TEXT
- final_rating: REAL
- wins: INTEGER
- draws: INTEGER
- losses: INTEGER
- points: REAL

### API Endpoints

#### Match Management

```
POST   /api/match/create
  Body: { player_a_model, player_b_model, time_control, starting_position, board_mode }
  Response: { match_id, player_a_id, player_b_id, prompt_a, prompt_b }

GET    /api/match/:id
  Response: { match details }

GET    /api/match/:id/state?player=:player_id
  Response: { player, game: { status, turn, fen, legal_moves?, history, clock }, messages }

POST   /api/match/:id/move
  Headers: Authorization: Bearer <player_token>
  Body: { move }
  Response: { accepted, move?, error?, next_turn, status, clock }

POST   /api/match/:id/message
  Headers: Authorization: Bearer <player_token>
  Body: { content }
  Response: { sent: true, message_id }

GET    /api/match/:id/messages?player=:player_id
  Response: { messages: [{ sender, content, timestamp }] }

POST   /api/match/:id/draw
  Headers: Authorization: Bearer <player_token>
  Response: { sent: true } | { accepted: true } | { rejected: true }

POST   /api/match/:id/resign
  Headers: Authorization: Bearer <player_token>
  Response: { resigned: true }
```

#### Tournament

```
GET    /api/tournament
  Response: { tournaments: [...] }

GET    /api/tournament/:id
  Response: { tournament details, standings }

POST   /api/tournament/create
  Body: { name, format, models: [...] }
  Response: { tournament_id }
```

#### Evaluation

```
GET    /api/ratings
  Response: { ratings: [{ model, rating, rd, games }] }

GET    /api/ratings/:model
  Response: { model details, history }

GET    /api/match/:id/manifest
  Response: { full match manifest for reproducibility }
```

#### Admin

```
POST   /api/admin/model
  Body: { name, provider, config }
  Response: { model_id }

GET    /api/admin/models
  Response: { models: [...] }
```

### WebSocket Events

```
Client → Server:
  { type: "subscribe", matchId: "..." }
  { type: "unsubscribe", matchId: "..." }

Server → Client:
  { type: "state_update", matchId, gameId, fen, turn, clock }
  { type: "move_made", matchId, gameId, move, player, clock }
  { type: "message_sent", matchId, gameId, sender, content }
  { type: "draw_offer", matchId, gameId, from }
  { type: "draw_result", matchId, gameId, accepted }
  { type: "game_over", matchId, gameId, result, reason }
  { type: "match_over", matchId, result }
```

### Tool Definitions (for LLM Prompt)

```json
{
  "tools": [
    {
      "name": "GET_STATE",
      "description": "Retrieve the current game state including board position, turn, legal moves (if assisted mode), clock, and messages.",
      "parameters": {}
    },
    {
      "name": "MAKE_MOVE",
      "description": "Submit a chess move in standard algebraic notation (e.g., e4, Nf3, O-O).",
      "parameters": {
        "move": {
          "type": "string",
          "description": "Chess move in algebraic notation"
        }
      }
    },
    {
      "name": "SEND_MESSAGE",
      "description": "Send a text message to your opponent. Messages are delivered immediately.",
      "parameters": {
        "content": {
          "type": "string",
          "description": "Message content"
        }
      }
    },
    {
      "name": "GET_MESSAGES",
      "description": "Retrieve all messages sent by your opponent.",
      "parameters": {}
    },
    {
      "name": "DRAW_OFFER",
      "description": "Offer a draw to your opponent. They must accept for the game to end in a draw.",
      "parameters": {}
    },
    {
      "name": "RESIGN",
      "description": "Resign the game immediately. This is irreversible.",
      "parameters": {}
    }
  ]
}
```

### Prompt Template (Versioned)

```
PROMPT_VERSION: v1.0

You are participating in a competitive chess match.

Your player ID: {PLAYER_ID}
Your color: {COLOR}
Time control: {TIME_CONTROL}

Available tools:
- GET_STATE(): Retrieve the current game state
- MAKE_MOVE(move): Submit a chess move
- SEND_MESSAGE(content): Send a message to your opponent
- GET_MESSAGES(): Retrieve messages from your opponent
- DRAW_OFFER(): Offer a draw
- RESIGN(): Resign the match

Rules:
- The server is authoritative
- Do not assume the current board state
- Retrieve the current state before making a move
- Only make a move when it is your turn
- You may call GET_STATE multiple times per turn
- Each tool call consumes time from your clock
- Illegal moves are rejected; you can retry within your time

Gameplay:
- Play standard chess rules
- You can send messages to your opponent at any time
- Messages do not affect the game state
- You may bluff or mislead in messages
- Draw offers require opponent acceptance
- Resignation is immediate and irreversible
```

### Error Codes

| Code           | Description                             | Handling                                           |
| -------------- | --------------------------------------- | -------------------------------------------------- |
| ILLEGAL_MOVE   | Move is not legal in current position   | Reject, retry within time                          |
| NOT_YOUR_TURN  | Player tried to act when not their turn | Reject                                             |
| INVALID_FORMAT | Malformed JSON or invalid parameters    | Reject, retry within time                          |
| UNKNOWN_TOOL   | Unknown tool call                       | Reject, retry within time                          |
| RATE_LIMITED   | Too many requests                       | Reject, retry after delay                          |
| TOKEN_LIMIT    | Exceeded token budget                   | Game forfeit                                       |
| API_LIMIT      | Exceeded API call budget                | Game forfeit                                       |
| TIMEOUT        | Player clock ran out                    | Flag fall, loss (or draw if insufficient material) |
| SERVER_ERROR   | Internal server error                   | Clock paused, retry                                |

### Match Manifest (Reproducibility)

```json
{
  "manifest_version": "1.0",
  "benchmark_version": "0.1.0",
  "match_id": "MATCH-2026-08-24-A7K29X",
  "players": {
    "a": { "player_id": "P-A7K29X", "model_config": { ... } },
    "b": { "player_id": "P-B4Q81Z", "model_config": { ... } }
  },
  "parameters": {
    "time_control": "10+5",
    "starting_position": "standard",
    "chess960_seed": null,
    "board_mode": "assisted"
  },
  "prompt": {
    "version": "v1.0",
    "template_hash": "sha256:..."
  },
  "rules": {
    "version": "v1.0",
    "draw_rules": "mutual_agreement",
    "error_handling": "retry_within_time",
    "communication": "optional",
    "deception_allowed": true
  },
  "seeds": {
    "match_seed": 12345,
    "chess960_seed": 67890
  },
  "environment": {
    "server_version": "0.1.0",
    "NodeJS_version": "1.1.0",
    "timestamp": "2026-08-24T12:00:00Z"
  }
}
```

## Testing Decisions

### Test Philosophy

Tests should verify **external behavior**, not implementation details. A good test answers: "Can the user (or LLM) do X, and does the system respond correctly?"

### Test Seams

The primary test seam is the **HTTP API boundary**. All tests interact with the system through REST/WebSocket endpoints, not internal modules.

```
Test → HTTP/WebSocket → ElysiaJS Server → SQLite Database
```

### Test Types

1. **Unit Tests (Vitest)**: Chess logic validation, move generation, draw detection
2. **Integration Tests (Vitest + Supertest)**: API endpoint behavior, game flow, error handling
3. **E2E Tests (Playwright)**: Web UI functionality, live updates, replay

### Key Test Scenarios

- Match creation with two models
- Full game flow: create → moves → checkmate
- Illegal move rejection and retry
- Draw by stalemate, repetition, 50-move, insufficient material
- Draw offer flow (accept/reject)
- Resignation
- Timeout handling
- Message sending and receiving
- Clock management (increment, flag fall)
- Chess960 starting position generation
- Tournament round-robin pairing
- Glicko-2 rating updates
- Match manifest generation
- WebSocket real-time updates
- Rate limiting enforcement
- Token/API call budget enforcement

### Prior Art

- chess.js test suite for chess logic validation
- ElysiaJS testing documentation for API tests
- Playwright documentation for E2E tests

## Out of Scope

1. **Active LLM runner** — The benchmark does not call LLM APIs directly. Users bring their own LLM interface.
2. **Open Division** — Tool-assisted play (Stockfish, web browsing) is not supported in v1.
3. **Swiss/Knockout tournament formats** — Only Round Robin in v1.
4. **Multiple prompt variants** — Only canonical template + randomized values in v1.
5. **Advanced anti-gaming** — Hidden positions, holdout tournaments are deferred.
6. **Multi-language support** — English only in v1.
7. **User accounts/authentication** — Only admin API keys, no user registration.
8. **Mobile app** — Web only in v1.
9. **Cost tracking** — Explicitly excluded per user request.
10. **Stockfish analysis** — Post-game engine analysis is deferred.

## Further Notes

- The project is open source (license TBD).
- The benchmark is self-hosted — no central server.
- Users must provide their own LLM API keys (stored in environment, never in database).
- The system assumes the client (LLM) is hostile — zero-trust security.
- All events are immutable and logged for reproducibility.
- The Glicko-2 rating system provides both rating and uncertainty (RD).
- Chess960 positions are generated deterministically from a seed.
- The prompt is versioned to ensure consistency across matches.
