import type { ModelConfig } from '@llm-chess-arena/shared'

const API_BASE = '/api'

export interface Match {
  id: string
  status: string
  currentGameIndex: number
  playerAId?: string
  playerBId?: string
  error?: string
  games: {
    id: string
    gameNumber: number
    status: string
    result: { winner: string; reason: string } | null
    moveCount: number
    whitePlayerId?: string
  }[]
}

export interface GameState {
  fen: string
  turn: 'white' | 'black'
  legalMoves?: string[]
  history: string[]
  clock: { white: number; black: number }
  isCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isDraw: boolean
  isGameOver: boolean
}

export interface Rating {
  model: string
  provider: string
  rating: number
  rd: number
  wins: number
  draws: number
  losses: number
  points: number
}

export async function createMatch(playerAModel: ModelConfig, playerBModel: ModelConfig): Promise<{ matchId: string; playerAId: string; playerBId: string; games: { id: string }[] }> {
  const res = await fetch(`${API_BASE}/match/create`, {
    body: JSON.stringify({ playerAModel, playerBModel, timeControl: '10+5', startingPosition: 'standard', boardMode: 'assisted' }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  return res.json()
}

export async function getMatch(matchId: string): Promise<Match> {
  const res = await fetch(`${API_BASE}/match/${matchId}`)
  return res.json()
}

export async function getGameState(matchId: string, gameId: string): Promise<GameState> {
  const res = await fetch(`${API_BASE}/match/${matchId}/state/${gameId}`)
  return res.json()
}

export async function getRatings(): Promise<{ ratings: Rating[] }> {
  const res = await fetch(`${API_BASE}/ratings`)
  return res.json()
}
