'use client'

import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react'
import { useForm } from '@tanstack/react-form'
import { Zap, Play, Radio, AlertCircle } from 'lucide-react'
import { useModels, useCreateMatch, type Model } from '../../lib/queries'

const DEFAULT_MODELS: Model[] = [
  { name: 'gpt-4o', provider: 'openai' },
  { name: 'claude-3-5-sonnet', provider: 'anthropic' },
]

export interface QuickLaunchBarProps {
  currentMatchId: string
  onConnectMatch: (matchId: string) => void
  onTokensReceived?: (tokens: { white: string; black: string }) => void
  loading: boolean
  error?: string
}

function MatchIdInputField({
  value,
  onChange,
  onBlur,
}: {
  value: string
  onChange: (val: string) => void
  onBlur: () => void
}) {
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

  return (
    <input
      type="text"
      placeholder="e.g., MATCH-1787585865651-702F59"
      value={value}
      onBlur={onBlur}
      onChange={handleChange}
      className="h-8 w-48 sm:w-60 rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 font-mono text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
      aria-label="Match ID"
    />
  )
}

export default function QuickLaunchBar({
  currentMatchId,
  onConnectMatch,
  onTokensReceived,
  loading,
  error,
}: QuickLaunchBarProps) {
  const { data: modelsData } = useModels()
  const models = modelsData && modelsData.length > 0 ? modelsData : DEFAULT_MODELS

  const [selectedWhite, setSelectedWhite] = useState<string>('gpt-4o')
  const [selectedBlack, setSelectedBlack] = useState<string>('claude-3-5-sonnet')
  const [launchError, setLaunchError] = useState('')

  const createMatchMutation = useCreateMatch()

  const handleWhiteChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedWhite(e.target.value)
  }, [])

  const handleBlackChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedBlack(e.target.value)
  }, [])

  const handleQuickLaunch = useCallback(async () => {
    const whiteModel = models.find((m) => m.name === selectedWhite) || { name: selectedWhite, provider: 'openai' }
    const blackModel = models.find((m) => m.name === selectedBlack) || { name: selectedBlack, provider: 'anthropic' }

    setLaunchError('')
    try {
      const match = await createMatchMutation.mutateAsync({
        playerAModel: { maxOutputTokens: 1000, name: whiteModel.name, provider: whiteModel.provider, temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 1000, name: blackModel.name, provider: blackModel.provider, temperature: 0.7, version: '1.0' },
      })
      onTokensReceived?.({ black: match.playerBToken, white: match.playerAToken })
      onConnectMatch(match.matchId)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Launch failed'
      setLaunchError(msg)
    }
  }, [models, selectedWhite, selectedBlack, createMatchMutation, onConnectMatch, onTokensReceived])

  // TanStack Form for Match Connection
  const connectForm = useForm({
    defaultValues: {
      matchId: '',
    },
    onSubmit: async ({ value }) => {
      const trimmed = value.matchId.trim()
      if (trimmed) {
        onConnectMatch(trimmed)
      }
    },
  })

  const handleConnectSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      e.stopPropagation()
      void connectForm.handleSubmit()
    },
    [connectForm],
  )

  return (
    <div className="mb-4 rounded-xl border border-[#242f42] bg-[#161d2a] p-3 shadow-lg shadow-black/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quick Match Creator */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-xs">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
            </span>
            <span>Quick Match:</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400">W:</span>
            <select
              value={selectedWhite}
              onChange={handleWhiteChange}
              className="h-8 rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 text-xs font-medium text-slate-200 focus:border-emerald-500 focus:outline-none"
              aria-label="White Player Model"
            >
              {models.map((m) => (
                <option key={`w-${m.name}`} value={m.name}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold text-slate-500">vs</span>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400">B:</span>
            <select
              value={selectedBlack}
              onChange={handleBlackChange}
              className="h-8 rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 text-xs font-medium text-slate-200 focus:border-emerald-500 focus:outline-none"
              aria-label="Black Player Model"
            >
              {models.map((m) => (
                <option key={`b-${m.name}`} value={m.name}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleQuickLaunch}
            disabled={createMatchMutation.isPending || loading}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{createMatchMutation.isPending ? 'Launching...' : '1-Click Launch'}</span>
          </button>
        </div>

        {/* Right: Manual Match ID & Connect (TanStack Form) */}
        <div className="flex items-center gap-2">
          {currentMatchId && (
            <span className="hidden xl:inline-flex items-center gap-1.5 rounded-md border border-slate-700/60 bg-slate-800/60 px-2.5 py-1 text-[11px] font-mono text-slate-300">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              <span>{currentMatchId}</span>
            </span>
          )}
          <form onSubmit={handleConnectSubmit} className="flex items-center gap-2">
            <connectForm.Field name="matchId">
              {(field) => (
                <MatchIdInputField
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                />
              )}
            </connectForm.Field>
            <button
              type="submit"
              disabled={loading}
              className="h-8 rounded-lg border border-[#2e3c54] bg-[#1c2536] px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
            >
              Connect
            </button>
          </form>
        </div>
      </div>

      {(launchError || error) && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 border border-rose-500/20" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{launchError || error}</span>
        </div>
      )}
    </div>
  )
}
