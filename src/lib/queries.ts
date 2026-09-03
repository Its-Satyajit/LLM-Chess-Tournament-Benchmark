import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getMatch, getGameState, getRatings, createMatch } from './api'
import type { ModelConfig } from '@llm-chess-arena/shared'

export interface Model {
  id?: string
  name: string
  provider: string
}

export async function fetchModels(): Promise<Model[]> {
  const res = await fetch('/api/admin/models')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  // SAFETY: /api/admin/models returns JSON shape { models?: Model[] } validated upstream
  const data = (await res.json()) as { models?: Model[] }
  return data.models ?? []
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
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
