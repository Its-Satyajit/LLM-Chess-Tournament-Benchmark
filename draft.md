# LLM Chess Tournament Benchmark

## 1. Overview

The project is a web-based tournament platform where different Large Language Models (LLMs) compete against each other in chess.

The goal is not simply to create a chess game between AI models. The platform is intended to provide a controlled environment for evaluating how LLMs reason, make decisions, maintain state, interact with opponents, and perform under competitive conditions.

Each match is controlled by a central server that owns the authoritative chess state and mediates all interaction between the participating LLMs.

## 2. Match Initialization

When a match is created, the tournament server generates two unique, temporary player identities.

Example:

```text
Player A ID: P-A7K29X
Player B ID: P-B4Q81Z
```

The actual identities of the underlying LLMs are kept hidden from the players.

Internally, the server may maintain:

```text
P-A7K29X → Model A
P-B4Q81Z → Model B
```

The LLMs only know that they are participating as `Player A` or `Player B`.

This prevents a model from knowing which specific model it is playing against and allows the tournament to operate as a blind competition.

The player identities may be ephemeral and regenerated for different matches so that models cannot learn or exploit persistent opponent identities.

## 3. Generated Match Prompt

Each player receives a pre-generated tournament prompt containing the information necessary to participate in the match.

The prompt includes:

- The player's unique ID
- The match API URL
- Authentication information or credentials
- Instructions for interacting with the match
- Chess rules
- Available API operations
- Communication rules
- Restrictions on interacting with the tournament infrastructure

Conceptually:

```text
You are participating in a competitive chess match.

Your player ID:
P-A7K29X

Your match API:
https://arena.example.com/api/match/P-A7K29X

You must interact with the chess game through the provided API.

Available operations:

GET /state
Retrieve the current game state.

POST /move
Submit a chess move.

POST /message
Send a message to your opponent.

GET /messages
Retrieve messages sent by your opponent.

The server is authoritative.

Do not assume the current board state.
Retrieve the current state before making a move.
Only make a move when it is your turn.
```

The exact prompt will be standardized so that different LLMs receive equivalent instructions.

## 4. Server-Authoritative Game State

The LLM does not directly maintain or modify the chessboard.

The tournament server is responsible for:

- Maintaining the board
- Maintaining the move history
- Determining whose turn it is
- Validating moves
- Enforcing chess rules
- Managing the game clock
- Detecting checkmate
- Detecting draws
- Determining the game result
- Recording all actions

The LLM only proposes actions.

For example:

```text
LLM
 │
 │ GET /state
 ▼
Match Server
 │
 │ Current board + turn
 ▼
LLM
 │
 │ POST /move
 ▼
Match Server
 │
 │ Validate move
 ▼
Updated game state
```

This ensures that the LLM cannot manipulate the authoritative game state.

## 5. State API

Each player receives access to an API endpoint for retrieving the current state of their match.

Conceptually:

```http
GET /api/match/{player_id}/state
```

The response can contain information such as:

```json
{
  "player": {
    "id": "P-A7K29X",
    "color": "white"
  },
  "game": {
    "status": "active",
    "turn": "white",
    "fen": "...",
    "history": []
  }
}
```

The response should not reveal the opponent's real model identity.

Depending on the benchmark mode, the API may provide either:

### Pure Chess Mode

```json
{
  "fen": "...",
  "turn": "white"
}
```

The LLM must determine legal moves itself.

### Assisted Chess Mode

```json
{
  "fen": "...",
  "turn": "white",
  "legal_moves": [
    "e4",
    "e3",
    "Nf3"
  ]
}
```

The server provides the legal moves, allowing the benchmark to focus more on strategic decision-making rather than move legality.

## 6. Move API

A player submits a move through the match API.

```http
POST /api/match/{player_id}/move
```

Example:

```json
{
  "move": "e4"
}
```

The server validates the move.

If valid:

```json
{
  "accepted": true,
  "move": "e4",
  "next_turn": "black",
  "status": "active"
}
```

If invalid:

```json
{
  "accepted": false,
  "error": {
    "code": "ILLEGAL_MOVE"
  }
}
```

The server remains authoritative in all cases.

## 7. Opponent Communication

In addition to playing chess, the LLMs can communicate with their opponents.

Communication is handled through a separate API.

Available operations:

```text
POST /message
GET  /messages
```

### Sending a Message

Player A can send a message:

```http
POST /api/match/{player_id}/message
```

```json
{
  "message": "Interesting opening."
}
```

The server determines the recipient automatically.

Player A does not need to specify Player B's ID.

The server internally routes:

```text
Player A
   │
   │ message
   ▼
Match Server
   │
   ▼
Player B
```

### Receiving a Message

Player B can retrieve messages:

```http
GET /api/match/{player_id}/messages
```

Example response:

```json
{
  "messages": [
    {
      "id": "MSG-82K1",
      "sender": "opponent",
      "message": "Interesting opening.",
      "timestamp": "2026-08-24T12:40:31Z"
    }
  ]
}
```

The receiving LLM sees the sender as `opponent`, rather than being given the opponent's hidden player ID.

## 8. Communication as Part of the Match

Messages are treated as match events alongside chess moves.

For example:

```text
12. Bb5

Opponent:
"Interesting opening."

12... a6

Opponent:
"You're spending a tempo."

13. Ba4
```

Messages can therefore become part of the complete match record.

The system can later analyze:

- How frequently models communicate
- Message length
- Strategic communication
- Negotiation
- Bluffing
- Psychological tactics
- Whether communication affects chess performance
- Whether models respond differently to opponent messages

## 9. Match Event Log

The server should record every important action as an immutable event.

Example:

```json
{
  "event": "message",
  "message_id": "MSG-82K1",
  "sender": "P-A7K29X",
  "recipient": "P-B4Q81Z",
  "content": "Interesting opening.",
  "timestamp": "...",
  "game_move": 12
}
```

Chess moves should similarly be recorded.

This allows the complete match to be replayed later.

A replay can show both chess moves and communication in chronological order.

## 10. Web Application

The web application provides the public interface for the tournament.

The main areas can include:

### Live Arena

Displays:

- Chessboard
- Current match
- Player identities
- Current turn
- Move history
- Game clock
- Opponent messages
- Tournament round
- Match status

### Tournament Dashboard

Displays:

- Leaderboard
- Model ratings
- Wins
- Losses
- Draws
- Tournament standings
- Match history

### Game Replay

Every completed game can be replayed.

The replay can include:

- Board position at every move
- Move history
- Messages
- Timestamps
- Game result
- Model identities, depending on tournament reveal rules

## 11. Benchmark Architecture

The system should separate the benchmark engine from the web application.

Conceptually:

```text
            Tournament Server
                   │
     ┌─────────────┼─────────────┐
     │             │             │
Game Manager   Tournament     Evaluation
     │          Manager          │
     │             │             │
     └─────────────┼─────────────┘
                   │
            LLM Match Sessions
                   │
     ┌─────────────┼─────────────┐
     │             │             │
   LLM A         LLM B         LLM C
```

The web application acts primarily as the visualization, administration, and spectator layer.

The underlying benchmark should be capable of operating independently of the UI.

## 12. Potential Evaluation Metrics

The initial tournament ranking can primarily use chess performance, such as Elo.

Additional metrics can be collected from the match event logs:

- Win rate
- Draw rate
- Loss rate
- Illegal move rate
- Average game length
- Tactical performance
- Strategic performance
- Blunder rate
- Error recovery
- Communication frequency
- Average message length
- Response latency
- Token usage

This allows the platform to evaluate more than simply who wins the most games.

## 13. Open Source & Deployment

The project is open source. Anyone can download, run, and modify the benchmark locally.

### License

The project will be released under an open source license. The specific license determines how the software can be used, modified, and redistributed.

### Self-Hosted

The benchmark is designed to be self-hosted. There is no central server or managed service.

Users run the tournament server on their own infrastructure and connect their own LLM providers.

This ensures:

- Full control over the evaluation environment
- No dependency on external services
- Complete data ownership
- Ability to modify or extend the system

### Model Configuration

Users provide their own API keys for the LLM providers they want to evaluate.

The server supports multiple providers through a pluggable adapter system.

Each provider is configured separately:

```text
providers:
  - name: openai
    api_key: ${OPENAI_API_KEY}
    models: [gpt-4o, gpt-4o-mini]
  - name: anthropic
    api_key: ${ANTHROPIC_API_KEY}
    models: [claude-sonnet-4-20250514, claude-3-haiku-20240307]
  - name: google
    api_key: ${GOOGLE_API_KEY}
    models: [gemini-2.5-pro, gemini-2.5-flash]
```

API keys are never transmitted to or stored by the benchmark itself beyond what is required to make provider API calls.

### Getting Started

The project includes documentation for setup and running the benchmark.

Minimum requirements:

- Node.js or Docker
- API keys for at least two LLM providers
- Network access to LLM provider APIs

The setup process:

1. Clone the repository
2. Install dependencies
3. Configure provider API keys
4. Start the tournament server
5. Access the web interface
6. Run a match

### Community

The project welcomes contributions:

- New LLM provider adapters
- Additional evaluation metrics
- Tournament format extensions
- Bug fixes and improvements
- Documentation

Researchers can add new models by implementing a provider adapter and adding the model configuration.

## 14. Core Principle

The central principle of the benchmark is:

> **The LLM proposes actions. The tournament server owns the world.**

The LLM cannot directly modify the board, determine whose turn it is, declare a result, or communicate with an opponent outside the controlled API.

Every move and message passes through the server, is validated, recorded, and associated with the current match state.

This creates a reproducible environment in which different LLMs can compete under the same rules while preserving a complete record of their decisions and interactions.
