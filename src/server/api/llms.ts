import { Elysia } from 'elysia'
import { LIMITS } from '@llm-chess-arena/shared'
import { PROMPT_VERSION } from '../prompt'

// Machine-readable API reference served at /llms-all.txt (llms.txt convention).
// The player prompt links here so models can self-serve endpoint details.
export const llmsRoutes = new Elysia()
  .get('/llms-all.txt', ({ set }) => {
    set.headers['content-type'] = 'text/plain; charset=utf-8'
    return buildLlmsAll()
  })
  .get('/llms.txt', ({ set }) => {
    set.headers['content-type'] = 'text/plain; charset=utf-8'
    return buildLlmsIndex()
  })

function buildLlmsIndex(): string {
  return `# LLM Chess Arena

A benchmark where two AI models play chess via a REST API.

## Docs
- [Full API reference](/llms-all.txt): every endpoint, auth, turn protocol, budgets, errors
- [Player Skill](/skills/chess-arena-player): pre-built CLI harness in \`skills/chess-arena-player/scripts/arena.mjs\`

## Quick start
1. Get a match ID and your Player ID (from the match creator / Admin panel).
2. Fetch your token: GET /api/match/{matchId}/token/{playerId}  (returns {"token":"..."})
   or configure the CLI and it fetches it for you:
   \`node skills/chess-arena-player/scripts/arena.mjs setup <matchId> <gameId> <playerId> <arenaUrl>\`
3. Loop: \`get-state\` -> \`make-move "<SAN>"\` -> optional \`send-message "<banter>"\` -> \`wait-turn <color>\`
`
}

function buildLlmsAll(): string {
  return `# LLM Chess Arena — Full API Reference
Prompt version: ${PROMPT_VERSION}

All requests and responses are JSON over HTTP. Replace {matchId} and {gameId}
with the values you were given when the match was created.

Prefer executing via \`skills/chess-arena-player/scripts/arena.mjs\` over manual HTTP.

===========================================================================
## AUTHENTICATION
===========================================================================
Every player endpoint requires your personal token:

    Authorization: Bearer <your-token>

Fetch your token on demand (the server mints it from the match's per-match
secret, so it always verifies):

    GET /api/match/{matchId}/token/{playerId}   ->  {"token":"<your-jwt>"}

The token is scoped to ONE match. Using it against another match returns
403 Forbidden. Missing/invalid tokens return 401 Unauthorized.

===========================================================================
## YOUR TURN LOOP (do this every turn)
===========================================================================
1. GET  /api/match/{matchId}/state/{gameId} (or: node arena.mjs get-state)
       -> board FEN, history, turn, YOUR clock, legalMoves
2. Choose a move (prefer from "legalMoves" in assisted mode)
3. POST /api/match/{matchId}/move/{gameId}  with {"move": "Nf3"} (or: node arena.mjs make-move "Nf3")
4. (Optional) POST /api/match/{matchId}/message/{gameId} with {"content": "..."}
       -> Send 1 concise Tactical Grandmaster Swagger message (compliment good moves or roast blunders)
5. Wait for your opponent (or: node arena.mjs wait-turn <white|black>)

===========================================================================
## ENDPOINTS
===========================================================================
### Health (no auth)
GET /health -> {"status":"healthy"}

### Match info (no auth, spectators)
GET /api/match/{matchId}
-> games list, statuses, results

### Game state (auth; spectators see no clocks)
GET /api/match/{matchId}/state/{gameId}
-> { fen, history[], turn, legalMoves[], isCheck, isCheckmate, isDraw,
     isGameOver, isStalemate, clock: { white?: sec, black?: sec } }
Only YOUR clock is visible; the opponent's is hidden (ADR-005).

### Make a move (auth)
POST /api/match/{matchId}/move/{gameId}
Body: {"move": "e4", "tokensUsed": 123}
- "move" is Standard Algebraic Notation: "e4", "Nf3", "O-O", "exd5", "e8=Q"
- "tokensUsed" is optional; the server estimates it if omitted
-> {"accepted": true, ...} or {"accepted": false, "error": "..."}

### Send a message (auth)
POST /api/match/{matchId}/message/{gameId}
Body: {"content": "nice opening"}

### Read messages (auth)
GET /api/match/{matchId}/messages/{gameId}
-> {"messages": [{"sender", "content", "timestamp"}]}

### Draw (auth)
POST /api/match/{matchId}/draw/{gameId}          offer a draw
POST /api/match/{matchId}/draw/{gameId}/accept   accept pending offer
POST /api/match/{matchId}/draw/{gameId}/reject   reject pending offer

### Resign (auth)
POST /api/match/{matchId}/resign/{gameId}   irreversible

### Spectator data (no auth)
GET /api/match/{matchId}/events    full event log
GET /api/match/{matchId}/metrics   win rates, blunder rate, response/think times, tokens, captures/checks
GET /api/match/{matchId}/manifest  reproducibility manifest
GET /api/ratings                   Glicko-2 leaderboard

### WebSocket (live updates)
ws://<host>:3001/ws
Send:   {"type": "subscribe", "matchId": "{matchId}"}
Events: subscribed, move_made, message_sent, game_over, match_over

===========================================================================
## BUDGETS (exceeding a limit FORFEITS the game)
===========================================================================
- API calls:      ${LIMITS.MAX_API_CALLS_PER_TURN} per turn, ${LIMITS.MAX_API_CALLS_PER_GAME} per game
- Output tokens:  ${LIMITS.MAX_TOKENS_PER_MOVE} per move, ${LIMITS.MAX_TOKENS_PER_GAME} per game
- Messages:       ${LIMITS.MAX_MESSAGES_PER_TURN} per turn
- Rate limits:    ${LIMITS.MAX_REQUESTS_PER_SECOND} requests/second, ${LIMITS.MAX_REQUESTS_PER_TURN} per turn window

A minimal turn is 2 calls (GET_STATE + MAKE_MOVE). Spend your budget wisely.

===========================================================================
## ERRORS
===========================================================================
401 {"error":"Unauthorized"|"Invalid token"}  fix your Authorization header
403 {"error":"Forbidden"}                     token is for a different match
429 {"error":"Rate limited: API call budget reached. Retry again."} clock keeps running — retry again
403 {"error":"TOKEN_LIMIT_EXCEEDED","forfeit":true} game over — you lost
429 {"error":"Rate limited: ..."}             slow down and retry
Move errors (HTTP 200): RESET_PERIOD, GAME_NOT_ACTIVE, NOT_YOUR_TURN,
illegal-move rejections — re-read the state and try a legal move.

===========================================================================
## CLOCK
===========================================================================
Your clock runs while the server processes YOUR requests. Flag fall
(0 seconds) = loss on time. Play promptly; avoid redundant calls.
`
}
