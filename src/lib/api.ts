import type { ModelConfig } from '@llm-chess-arena/shared'
import { api } from './eden'

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
    displayPlayerAId?: string
    displayPlayerBId?: string
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

export interface HistoryGame {
  id: string
  gameNumber: number
  status: 'pending' | 'active' | 'completed'
  result: { winner: string; reason: string } | null
  moveCount: number
  whitePlayerId: string
  blackPlayerId: string
  startingPosition: 'standard' | 'chess960'
}

export interface HistoryMatch {
  id: string
  status: 'active' | 'completed'
  createdAt: string
  completedAt: string | null
  currentGameIndex: number
  timeControl: string
  playerAId: string
  playerBId: string
  playerAModel: { name: string; provider: string }
  playerBModel: { name: string; provider: string }
  games: HistoryGame[]
}

export async function listMatches(): Promise<HistoryMatch[]> {
  const res = await fetch('/api/match')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { matches?: HistoryMatch[] }
  return data.matches ?? []
}

export async function createMatch(
  playerAModel: ModelConfig,
  playerBModel: ModelConfig,
): Promise<{
  matchId: string
  playerAId: string
  playerBId: string
  playerAToken: string
  playerBToken: string
  games: { id: string }[]
}> {
  const { data, error } = await api.api.match.create.post({
    boardMode: 'assisted',
    playerAModel,
    playerBModel,
    startingPosition: 'standard',
    timeControl: '10+5',
  })

  if (error || !data || !('matchId' in data)) {
    throw new Error('Failed to create match')
  }

  return {
    games: data.games.map(g => ({ id: g.id })),
    matchId: data.matchId,
    playerAId: data.playerAId,
    playerAToken: data.playerAToken,
    playerBId: data.playerBId,
    playerBToken: data.playerBToken,
  }
}

export async function getMatch(matchId: string): Promise<Match> {
  const { data, error, status } = await api.api.match({ matchId }).get()

  if (error || !data || status === 404 || !('games' in data)) {
    return {
      currentGameIndex: 0,
      error: 'Match not found',
      games: [],
      id: matchId,
      status: 'error',
    }
  }

  return {
    currentGameIndex: data.currentGameIndex,
    games: data.games.map(g => ({
      displayPlayerAId: g.displayPlayerAId,
      displayPlayerBId: g.displayPlayerBId,
      gameNumber: g.gameNumber,
      id: g.id,
      moveCount: g.moveCount,
      result: g.result ? { reason: g.result.reason, winner: g.result.winner ?? '' } : null,
      status: g.status,
      whitePlayerId: g.whitePlayerId,
    })),
    id: data.id,
    playerAId: data.playerAId,
    playerBId: data.playerBId,
    status: data.status,
  }
}

export async function getGameState(matchId: string, gameId: string): Promise<GameState> {
  const { data, error } = await api.api.match({ matchId }).state({ gameId }).get()

  if (error || !data || 'error' in data) {
    throw new Error('Failed to fetch game state')
  }

  // SAFETY: Engine gameState conforms to GameState interface validated upstream
  return data as GameState
}

export async function getRatings(): Promise<{ ratings: Rating[] }> {
  console.log('[getRatings] fetching')
  const { data, error, status } = await api.api.ratings.get()
  console.log('[getRatings] data', data, 'error', error, 'status', status)
  if (error || !data || !('ratings' in data)) {
    throw new Error('Failed to fetch ratings')
  }

  return {
    ratings: data.ratings.map(r => ({
      draws: r.draws,
      losses: r.losses,
      model: r.model,
      points: r.points,
      provider: r.provider,
      rating: r.rating,
      rd: 0,
      wins: r.wins,
    })),
  }
}
