'use client'

import { useEffect, useState, useCallback, useMemo, type FormEvent, type ChangeEvent, type FocusEvent } from 'react'
import { createMatch } from '../lib/api'

interface Model {
  id?: string
  name: string
  provider: string
}

type LoadState = 'loading' | 'loaded' | 'error'

const selectOnFocus = (e: FocusEvent<HTMLInputElement>) => {
  e.currentTarget.select()
}

// One token handoff row: read-only value + copy button
function TokenRow({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] font-semibold text-slate-400">{label}</span>
      <div className="flex gap-2">
        <input
          readOnly
          value={value}
          onFocus={selectOnFocus}
          aria-label={label}
          className="h-8 flex-1 rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 font-mono text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={onCopy}
          className="rounded-lg border border-[#2e3c54] bg-[#1c2536] px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function ModelRowItem({
  model,
  index,
  isSelected,
  maxSelected,
  onToggle,
}: {
  model: Model
  index: number
  isSelected: boolean
  maxSelected: boolean
  onToggle: (index: number) => void
}) {
  const handleClick = useCallback(() => {
    onToggle(index)
  }, [index, onToggle])

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSelected}
      aria-label={`Select ${model.name} (${model.provider})`}
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-medium transition ${
        isSelected
          ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-sm'
          : 'border-[#2e3c54] bg-[#111620] text-slate-300 hover:bg-[#1a2230] hover:text-white'
      }`}
      title={maxSelected && !isSelected ? 'Deselect a model first — max 2' : undefined}
    >
      <span className="font-semibold text-slate-200">{model.name}</span>
      <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">{model.provider}</span>
    </button>
  )
}

export default function Admin() {
  const [models, setModels] = useState<Model[]>([])
  const [modelsState, setModelsState] = useState<LoadState>('loading')
  const [newModel, setNewModel] = useState({ name: '', provider: '' })
  const [addingModel, setAddingModel] = useState(false)
  const [modelError, setModelError] = useState('')
  const [matchResult, setMatchResult] = useState<{ matchId?: string; ok: boolean; text: string } | null>(null)
  const [createdTokens, setCreatedTokens] = useState<{ black: string; white: string } | null>(null)
  const [startingMatch, setStartingMatch] = useState(false)
  const [selectedModels, setSelectedModels] = useState<number[]>([])
  const [copiedToken, setCopiedToken] = useState<'A' | 'B' | null>(null)

  const selectedModelsSet = useMemo(() => new Set(selectedModels), [selectedModels])

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/models')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      // SAFETY: /api/admin/models response payload adheres to { models: Model[] } schema
      const data = (await res.json()) as { models?: Model[] }
      setModels(data.models || [])
      setModelsState('loaded')
    } catch {
      setModelsState('error')
    }
  }, [])

  const reloadModels = useCallback(() => {
    setModelsState('loading')
    void fetchModels()
  }, [fetchModels])

  useEffect(() => {
    let active = true
    fetch('/api/admin/models')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { models?: Model[] }) => {
        if (active) {
          setModels(data.models || [])
          setModelsState('loaded')
        }
      })
      .catch(() => {
        if (active) {
          setModelsState('error')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const addModel = useCallback(async () => {
    if (!newModel.name || !newModel.provider || addingModel) return
    setAddingModel(true)
    setModelError('')
    try {
      const res = await fetch('/api/admin/models', {
        body: JSON.stringify(newModel),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      setNewModel({ name: '', provider: '' })
      await fetchModels()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register model'
      setModelError(msg)
    } finally {
      setAddingModel(false)
    }
  }, [newModel, addingModel, fetchModels])

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNewModel((prev) => ({ ...prev, name: e.target.value }))
  }, [])

  const handleProviderChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setNewModel((prev) => ({ ...prev, provider: e.target.value }))
  }, [])

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      void addModel()
    },
    [addModel],
  )

  const toggleModel = useCallback((idx: number) => {
    setSelectedModels((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx)
      }
      if (prev.length >= 2) {
        return prev
      }
      return [...prev, idx]
    })
  }, [])

  const startMatch = useCallback(async () => {
    if (selectedModels.length !== 2 || startingMatch) return
    setStartingMatch(true)
    setMatchResult(null)
    setCreatedTokens(null)
    try {
      const mA = models[selectedModels[0]]
      const mB = models[selectedModels[1]]
      const data = await createMatch(
        { maxOutputTokens: 1000, name: mA.name, provider: mA.provider, temperature: 0.7, version: '1.0' },
        { maxOutputTokens: 1000, name: mB.name, provider: mB.provider, temperature: 0.7, version: '1.0' },
      )
      setMatchResult({
        matchId: data.matchId,
        ok: true,
        text: `Match created: ${data.matchId}`,
      })
      setCreatedTokens({
        black: data.playerBToken,
        white: data.playerAToken,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setMatchResult({ ok: false, text: `Failed to create match: ${msg}` })
    } finally {
      setStartingMatch(false)
    }
  }, [selectedModels, startingMatch, models])

  const copyToken = useCallback(
    async (which: 'A' | 'B') => {
      if (!createdTokens) return
      try {
        await navigator.clipboard.writeText(which === 'A' ? createdTokens.white : createdTokens.black)
        setCopiedToken(which)
        setTimeout(() => setCopiedToken(null), 2000)
      } catch {
        // Input is readOnly
      }
    },
    [createdTokens],
  )

  const handleCopyA = useCallback(() => {
    void copyToken('A')
  }, [copyToken])

  const handleCopyB = useCallback(() => {
    void copyToken('B')
  }, [copyToken])

  const openInArena = useCallback(() => {
    if (!matchResult?.matchId) return
    localStorage.setItem('arena.lastMatchId', matchResult.matchId)
    document.getElementById('arena')?.scrollIntoView({ behavior: 'smooth' })
  }, [matchResult])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#242f42] pb-3">
        <h2 className="text-lg font-bold tracking-tight text-white">⚙️ Tournament Admin & Models</h2>
        <span className="text-xs text-slate-400">Configure benchmark participants</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Registered Models */}
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Registered Models</h3>
            <p className="text-xs text-slate-400">Add an LLM model by name and API provider.</p>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[140px] text-xs font-semibold text-slate-300">
              Model Name
              <input
                type="text"
                placeholder="e.g., gpt-4o"
                value={newModel.name}
                onChange={handleNameChange}
                className="mt-1 h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <label className="flex-1 min-w-[120px] text-xs font-semibold text-slate-300">
              Provider
              <input
                type="text"
                placeholder="e.g., openai"
                value={newModel.provider}
                onChange={handleProviderChange}
                className="mt-1 h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={addingModel}
              className="h-8 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {addingModel ? 'Adding...' : 'Add'}
            </button>
          </form>

          {modelError && <p role="alert" className="text-xs text-rose-400">{modelError}</p>}
          {modelsState === 'loading' && <p className="text-xs text-slate-500" aria-busy="true">Loading models...</p>}
          {modelsState === 'error' && (
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <span>Failed to load models.</span>
              <button type="button" onClick={reloadModels} className="underline">Retry</button>
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-[#242f42]">
            {models.map((m, i) => (
              <ModelRowItem
                key={`${m.provider}-${m.name}`}
                model={m}
                index={i}
                isSelected={selectedModelsSet.has(i)}
                maxSelected={selectedModels.length >= 2}
                onToggle={toggleModel}
              />
            ))}
          </div>
        </div>

        {/* Card 2: Custom Match Creator */}
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Custom Match Setup</h3>
            <p className="text-xs text-slate-400">Pick two models from the left to run a 4-game series.</p>
          </div>

          <div className="rounded-lg border border-[#242f42] bg-[#111620] p-3 text-xs">
            <output aria-live="polite" className="block text-slate-300">
              {selectedModels.length === 0 && <span className="text-slate-500">No models selected</span>}
              {selectedModels.length === 1 && (
                <span className="text-amber-400 font-semibold">Select 1 more model from the left</span>
              )}
              {selectedModels.length === 2 && (
                <span className="text-emerald-400 font-bold">
                  {models[selectedModels[0]].name} vs {models[selectedModels[1]].name}
                </span>
              )}
            </output>
          </div>

          <button
            type="button"
            onClick={startMatch}
            disabled={selectedModels.length !== 2 || startingMatch}
            className="w-full h-9 rounded-lg bg-emerald-600 font-bold text-xs text-white shadow transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {startingMatch ? 'Creating Match...' : 'Create Match'}
          </button>

          {matchResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2 text-center text-xs text-emerald-300">
              <output aria-live="polite">{matchResult.text}</output>
            </div>
          )}

          {createdTokens && (
            <div className="space-y-3 pt-2 border-t border-[#242f42]">
              <div className="text-xs font-semibold text-slate-300">Bearer Tokens</div>
              <TokenRow label="Player A (White Game 1)" value={createdTokens.white} copied={copiedToken === 'A'} onCopy={handleCopyA} />
              <TokenRow label="Player B (Black Game 1)" value={createdTokens.black} copied={copiedToken === 'B'} onCopy={handleCopyB} />
              <button
                type="button"
                onClick={openInArena}
                className="w-full h-8 rounded-lg border border-[#2e3c54] bg-[#1c2536] text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Open in Arena →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
