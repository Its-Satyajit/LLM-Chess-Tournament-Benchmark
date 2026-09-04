import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatch, getGameState, getRatings, createMatch, getMatchTokens } from './api'
import type { ModelConfig } from '@llm-chess-arena/shared'

export interface Model {
  id?: string
  name: string
  provider: string
}

export async function fetchModels(): Promise<Model[]> {
  console.log('[fetchModels] fetching /api/admin/models')
  const res = await fetch('/api/admin/models')
  console.log('[fetchModels] res', res.status, res.ok)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // SAFETY: /api/admin/models returns JSON shape { models?: Model[] } validated upstream
  const data = (await res.json()) as { models?: Model[] }
  console.log('[fetchModels] data', data)
  return data.models ?? []
}

export function useModels() {
  console.log('[useModels] called')
  return useQuery({
    queryKey: ['models'],
    queryFn: (...args) => {
      console.log('[useModels] queryFn called', args)
      return fetchModels()
    },
    staleTime: 10_000,
  })
}

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: ['match', matchId],
    queryFn: () => getMatch(matchId),
    enabled: Boolean(matchId.trim()),
    staleTime: 5_000,
  })
}

// Fetches valid, server-issued player tokens for a match (minted from the DB
// per-match secret), so the prompt/Bearer fields never use a bad token.
export function useMatchTokens(matchId: string) {
  return useQuery({
    queryKey: ['matchTokens', matchId],
    queryFn: () => getMatchTokens(matchId),
    enabled: Boolean(matchId.trim()),
    staleTime: 60_000,
  })
}

export function useGameState(matchId: string, gameId: string) {
  return useQuery({
    queryKey: ['gameState', matchId, gameId],
    queryFn: () => getGameState(matchId, gameId),
    enabled: Boolean(matchId.trim() && gameId.trim()),
    staleTime: 2_000,
  })
}

export function useRatings() {
  return useQuery({
    queryKey: ['ratings'],
    queryFn: getRatings,
    staleTime: 15_000,
  })
}

export function useAddModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (model: { name: string; provider: string }) => {
      const res = await fetch('/api/admin/models', {
        body: JSON.stringify(model),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        // SAFETY: error response JSON shape { message?: string } from admin API
        const err = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      // SAFETY: /api/admin/models POST returns created Model JSON validated upstream
      return (await res.json()) as Model
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })
}

export function useDeleteModel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (modelId: string) => {
      const res = await fetch(`/api/admin/models/${encodeURIComponent(modelId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['models'] })
    },
  })
}

export function useCreateMatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      playerAModel,
      playerBModel,
    }: {
      playerAModel: ModelConfig
      playerBModel: ModelConfig
    }) => {
      return createMatch(playerAModel, playerBModel)
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['match', data.matchId] })
    },
  })
}

export interface ModelBenchmarkData {
  model: string
  provider: string
  rating: number
  rd: number
  gamesPlayed: number
  wins: number
  draws: number
  losses: number
  points: number
  winRate: number
  avgAccuracy: number | null
  blunderRate: number
  avgThinkTimeSeconds: number
  avgTokensPerMove: number
  totalTokensUsed: number
  evaluatedGamesCount: number
  classifications: {
    brilliant: number
    best: number
    excellent: number
    good: number
    inaccuracy: number
    mistake: number
    miss: number
    blunder: number
  }
}

export interface BenchmarkMetricsResponse {
  models: ModelBenchmarkData[]
  totalMatches: number
  totalGames: number
  evaluatedGames: number
  lastUpdated: string | Date
}

export function useBenchmarkMetrics() {
  return useQuery({
    queryKey: ['benchmarkMetrics'],
    queryFn: async (): Promise<BenchmarkMetricsResponse> => {
      const res = await fetch('/api/benchmark')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // SAFETY: /api/benchmark returns JSON shape matching BenchmarkMetricsResponse
      return (await res.json()) as BenchmarkMetricsResponse
    },
    staleTime: 10_000,
  })
}

import type { PlyReview, PlayerReviewSummary } from './gameReview/coordinator'
import type { MoveClassificationType } from './gameReview/metrics'

export interface CachedReviewResponse {
  id: string
  gameId: string
  matchId: string
  depth: number
  whiteAccuracy: number
  blackAccuracy: number
  whiteRating: number | null
  blackRating: number | null
  classificationCounts: {
    white: Record<MoveClassificationType, number>
    black: Record<MoveClassificationType, number>
  }
  plies: PlyReview[]
  createdAt: string | Date
  white?: PlayerReviewSummary
  black?: PlayerReviewSummary
}

export function useGameReviewQuery(gameId: string) {
  return useQuery<CachedReviewResponse | null>({
    queryKey: ['gameReview', gameId],
    queryFn: async () => {
      if (!gameId.trim()) return null
      const res = await fetch(`/api/game/${encodeURIComponent(gameId)}/review`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // SAFETY: /api/game/:gameId/review returns cached review JSON matching CachedReviewResponse
      return (await res.json()) as CachedReviewResponse
    },
    enabled: Boolean(gameId.trim()),
    staleTime: 60_000,
  })
}

export interface ReviewPayloadLike {
  id?: string
  matchId?: string
  depth?: number
  whiteAccuracy?: number
  blackAccuracy?: number
  whiteRating?: number | null
  blackRating?: number | null
  classificationCounts?: {
    white: Record<string, number>
    black: Record<string, number>
  }
  plies?: unknown[]
  white?: {
    accuracy: number
    estimatedRating?: number
    classificationCounts?: Record<string, number>
  }
  black?: {
    accuracy: number
    estimatedRating?: number
    classificationCounts?: Record<string, number>
  }
}

export async function saveGameReviewToDb(gameId: string, review: ReviewPayloadLike): Promise<void> {
  try {
    const payload = {
      blackAccuracy: Number.isFinite(review.blackAccuracy) ? review.blackAccuracy : (review.black?.accuracy ?? 0),
      blackRating: Number.isFinite(review.blackRating) ? review.blackRating : (review.black?.estimatedRating ?? null),
      classificationCounts: review.classificationCounts ?? {
        black: review.black?.classificationCounts ?? {},
        white: review.white?.classificationCounts ?? {},
      },
      depth: Number.isFinite(review.depth) ? review.depth : 14,
      id: review.id ?? `rev-${gameId}`,
      matchId: review.matchId ?? '',
      plies: review.plies ?? [],
      whiteAccuracy: Number.isFinite(review.whiteAccuracy) ? review.whiteAccuracy : (review.white?.accuracy ?? 0),
      whiteRating: Number.isFinite(review.whiteRating) ? review.whiteRating : (review.white?.estimatedRating ?? null),
    }

    const res = await fetch(`/api/game/${encodeURIComponent(gameId)}/review`, {
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    })
    if (!res.ok) {
      console.warn(`[saveGameReviewToDb] Failed to save review: HTTP ${res.status}`)
    }
  } catch (err) {
    console.warn('[saveGameReviewToDb] Network error saving review:', err)
  }
}


