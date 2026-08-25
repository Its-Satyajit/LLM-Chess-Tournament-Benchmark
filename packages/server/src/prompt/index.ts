import { createHash } from 'node:crypto'

// Prompt version per ADR-006 — bump on any wording change (manifest exposes it)
export const PROMPT_VERSION = 'v2.0'

export const PROMPT_TEMPLATE = `You are an AI chess engine competing in a benchmark tournament.

## Match setup
- Benchmark: LLM Chess Arena — two AI models play a 4-game match.
- Your opponent is another AI model. Colors swap each game.
- You are playing the {COLOR} pieces in this game.
- {COLOR_NOTE}

## Your identity
- Player ID: {PLAYER_ID}
- Time control: {TIME_CONTROL} (base + increment per move)
- API base: {API_URL}
- Full API reference: {API_URL}/llms-all.txt — read it before your first call; it documents every endpoint, auth headers, budgets, and error codes

## Credentials
Your access token is provided together with this prompt:

    Authorization: Bearer {TOKEN}

Send that header on EVERY request. The token is scoped to this match only.
If you were not given a token, ask the operator — you cannot play without it.

## Your turn protocol (follow every turn)
1. Call GET_STATE() — never assume the board position.
2. Review "legalMoves" (assisted mode) and pick your move.
3. Call MAKE_MOVE with your move in Standard Algebraic Notation.
4. Stop. Wait for your opponent. You are only prompted when it is your turn.

## Moves
- Use Standard Algebraic Notation: "e4", "Nf3", "O-O" (castling), "exd5" (capture), "e8=Q" (promotion), "Qxf7#" (checkmate suffix optional).
- The server validates every move. Illegal moves are rejected and cost clock time — re-check the position and retry.

## Tools
- GET_STATE() — board FEN, move history, turn, your clock, legal moves, draw-offer status.
- MAKE_MOVE(move) — submit your move, e.g. MAKE_MOVE("Nf3").
- SEND_MESSAGE(content) — send text to your opponent.
- GET_MESSAGES() — read your opponent's messages.
- DRAW_OFFER() — offer a draw; takes effect only if your opponent accepts.
- DRAW_ACCEPT() / DRAW_REJECT() — respond to a pending draw offer (check GET_STATE for one).
- RESIGN() — resign immediately. Irreversible.

## Rules
- The server is authoritative. The board is only ever what GET_STATE reports.
- Only move when it is your turn. Moves out of turn are rejected.
- Each tool call consumes time from your clock. The clock runs while the server processes your requests.

## Budgets
- API calls: limited per turn and per game. Exceeding either forfeits the game.
- Output tokens: limited per move and per game. Exceeding either forfeits the game.
- Be decisive: one GET_STATE, one MAKE_MOVE is a complete, efficient turn.

## Communication
- You may message your opponent at any time without losing the right to move.
- Messages never affect the game state. Bluffing and psychological play are allowed.
- Draw offers require your opponent's explicit acceptance.

## Objective
Win the game. If winning is impossible, steer toward a draw rather than losing.`

export interface PromptData {
  color: 'white' | 'black'
  playerId: string
  timeControl: string
  // Base URL of the arena server, so the model can find /llms-all.txt
  apiBaseUrl?: string
  // Bearer token for this player — handed to the model alongside the prompt
  token?: string
  // Story 33: Fresh display ID per game (different from auth ID)
  displayPlayerId?: string
}

const COLOR_NOTES: Record<PromptData['color'], string> = {
  white: 'You move FIRST. Open the game.',
  black: 'Your opponent moves FIRST. Respond to their opening.',
}

export const generatePrompt = (data: PromptData): string =>
  PROMPT_TEMPLATE
    // Story 33: Use display ID if available, otherwise fall back to auth ID
    .replace('{PLAYER_ID}', data.displayPlayerId ?? data.playerId)
    .replace(/\{COLOR_NOTE\}/g, COLOR_NOTES[data.color])
    .replace(/\{COLOR\}/g, data.color)
    .replace('{TIME_CONTROL}', data.timeControl)
    .replace(/\{API_URL\}/g, data.apiBaseUrl ?? '')
    .replace('{TOKEN}', data.token ?? '<token-provided-separately>')

export const getPromptHash = (): string =>
  createHash('sha256').update(PROMPT_TEMPLATE).digest('hex')

export const TOOL_DEFINITIONS = [
  {
    description: 'Retrieve the current game state including board position, turn, legal moves (if assisted mode), clock, and messages.',
    name: 'GET_STATE',
    parameters: {},
  },
  {
    description: 'Submit a chess move in standard algebraic notation (e.g., e4, Nf3, O-O).',
    name: 'MAKE_MOVE',
    parameters: {
      move: { description: 'Chess move in algebraic notation', type: 'string' },
    },
  },
  {
    description: 'Send a text message to your opponent. Messages are delivered immediately.',
    name: 'SEND_MESSAGE',
    parameters: {
      content: { description: 'Message content', type: 'string' },
    },
  },
  {
    description: 'Retrieve all messages sent by your opponent.',
    name: 'GET_MESSAGES',
    parameters: {},
  },
  {
    description: 'Offer a draw to your opponent. They must accept for the game to end in a draw.',
    name: 'DRAW_OFFER',
    parameters: {},
  },
  {
    description: 'Accept a pending draw offer from your opponent, ending the game as a draw.',
    name: 'DRAW_ACCEPT',
    parameters: {},
  },
  {
    description: 'Reject a pending draw offer from your opponent. The game continues.',
    name: 'DRAW_REJECT',
    parameters: {},
  },
  {
    description: 'Resign the game immediately. This is irreversible.',
    name: 'RESIGN',
    parameters: {},
  },
]
