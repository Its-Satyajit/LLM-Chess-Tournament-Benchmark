import type {
  BenchmarkConfig,
  BenchmarkMatchType,
  BenchmarkParticipant,
  BenchmarkParticipants,
  BenchmarkResult,
  BenchmarkStatus,
  BenchmarkSummary as SharedBenchmarkSummary,
  ModelConfig,
} from '@llm-chess-arena/shared'
import { api } from './eden'

export type {
  BenchmarkConfig,
  BenchmarkMatchType,
  BenchmarkParticipant,
  BenchmarkParticipants,
  BenchmarkResult,
  BenchmarkStatus,
}
export type BenchmarkSummary = SharedBenchmarkSummary

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
  /** Explicit benchmark semantics when a user-created benchmark backs this match. */
  matchType?: 'llm_vs_llm' | 'llm_vs_user'
  /** Human participant's public display name for LLM vs User matches. */
  humanName?: string | null
  games: HistoryGame[]
}

export async function listMatches(): Promise<HistoryMatch[]> {
  const res = await fetch('/api/match')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // SAFETY: /api/match returns { matches?: HistoryMatch[] } validated upstream
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

export interface MatchTokens {
  playerAId: string
  playerAToken: string
  playerBId: string
  playerBToken: string
}

// Mint valid player tokens for a match from its DB per-match secret, so the
// UI always injects server-issued tokens into the prompt / Bearer fields.
export async function getMatchTokens(matchId: string): Promise<MatchTokens> {
  const res = await fetch(`/api/match/${encodeURIComponent(matchId)}/tokens`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // SAFETY: /api/match/:matchId/tokens returns { playerAId, playerAToken, playerBId, playerBToken }
  const data = (await res.json()) as MatchTokens
  if (!data.playerAToken || !data.playerBToken) {
    throw new Error('Failed to fetch player tokens')
  }
  return data
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

// --- User-owned benchmarks (auth required; owner derived from the session) ---

export interface BenchmarkCreateInput {
  matchType: 'llm_vs_llm' | 'llm_vs_user'
  title?: string
  visibility?: 'public' | 'private'
  timeControl?: string
  boardMode?: 'assisted' | 'pure'
  startingPosition?: 'standard' | 'chess960'
  playerAModelId?: string
  playerBModelId?: string
  llmModelId?: string
}

export interface BenchmarkStartResult extends BenchmarkSummary {
  matchId: string
  playerAId: string
  playerAToken: string
  playerBId: string
  playerBToken: string
}

async function parseError(res: Response): Promise<never> {
  let message = `HTTP ${res.status}`
  try {
    // SAFETY: error body shape { error?: string } from our Elysia routes
    const body = (await res.json()) as { error?: string }
    if (body.error) message = body.error
  } catch {
    // non-JSON error body — fall back to status text
  }
  throw new Error(message)
}

export async function listMyBenchmarks(): Promise<BenchmarkSummary[]> {
  const res = await fetch('/api/benchmarks', { credentials: 'same-origin' })
  if (!res.ok) await parseError(res)
  // SAFETY: /api/benchmarks returns { benchmarks: BenchmarkSummary[] }
  const data = (await res.json()) as { benchmarks: BenchmarkSummary[] }
  return data.benchmarks ?? []
}

export async function createBenchmark(input: BenchmarkCreateInput): Promise<BenchmarkSummary> {
  const res = await fetch('/api/benchmarks', {
    body: JSON.stringify(input),
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  if (!res.ok) await parseError(res)
  // SAFETY: create returns { benchmark: BenchmarkSummary }
  const data = (await res.json()) as { benchmark: BenchmarkSummary }
  return data.benchmark
}

export async function getBenchmark(id: string): Promise<BenchmarkSummary> {
  const res = await fetch(`/api/benchmarks/${encodeURIComponent(id)}`, { credentials: 'same-origin' })
  if (!res.ok) await parseError(res)
  // SAFETY: detail returns { benchmark: BenchmarkSummary }
  const data = (await res.json()) as { benchmark: BenchmarkSummary }
  return data.benchmark
}

export async function startBenchmark(id: string): Promise<BenchmarkStartResult> {
  const res = await fetch(`/api/benchmarks/${encodeURIComponent(id)}/start`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  if (!res.ok) await parseError(res)
  // SAFETY: start returns { benchmark, matchId, playerAId, playerAToken, playerBId, playerBToken }
  const data = await res.json() as {
    benchmark: BenchmarkSummary
    matchId: string
    playerAId: string
    playerAToken: string
    playerBId: string
    playerBToken: string
  }
  return { ...data.benchmark, ...data }
}

export async function cancelBenchmark(id: string): Promise<BenchmarkSummary> {
  const res = await fetch(`/api/benchmarks/${encodeURIComponent(id)}/cancel`, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  if (!res.ok) await parseError(res)
  // SAFETY: cancel returns { benchmark: BenchmarkSummary }
  const data = (await res.json()) as { benchmark: BenchmarkSummary }
  return data.benchmark
}

export async function deleteBenchmark(id: string): Promise<void> {
  const res = await fetch(`/api/benchmarks/${encodeURIComponent(id)}`, {
    credentials: 'same-origin',
    method: 'DELETE',
  })
  if (!res.ok) await parseError(res)
}
