import { createHash } from 'crypto'

export const PROMPT_TEMPLATE = `You are participating in a competitive chess match.

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
- Resignation is immediate and irreversible`

export interface PromptData {
  playerId: string
  color: 'white' | 'black'
  timeControl: string
}

export function generatePrompt(data: PromptData): string {
  return PROMPT_TEMPLATE
    .replace('{PLAYER_ID}', data.playerId)
    .replace('{COLOR}', data.color)
    .replace('{TIME_CONTROL}', data.timeControl)
}

export function getPromptHash(): string {
  return createHash('sha256').update(PROMPT_TEMPLATE).digest('hex')
}

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
    description: 'Resign the game immediately. This is irreversible.',
    name: 'RESIGN',
    parameters: {},
  },
]
