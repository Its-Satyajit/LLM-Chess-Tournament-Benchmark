'use client'

import { useCallback, useState, type FormEvent } from 'react'
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useCreateBenchmark, useModels } from '../../lib/queries'
import type { BenchmarkCreateInput, BenchmarkSummary } from '../../lib/api'

const TIME_CONTROL_OPTIONS = [
  { label: 'Rapid 10+5', value: '10+5' },
  { label: 'Blitz 5+3', value: '5+3' },
  { label: 'Blitz 3+2', value: '3+2' },
  { label: 'Classical 30+10', value: '30+10' },
] as const

const selectClass =
  'h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-2 text-xs font-medium text-slate-200 focus:border-emerald-500 focus:outline-none'
const labelClass = 'block text-[11px] font-semibold text-slate-400'

export default function BenchmarkCreateForm({
  onCreated,
}: {
  onCreated?: (benchmark: BenchmarkSummary) => void
}) {
  const { data: modelsData } = useModels()
  const models = (modelsData ?? []).filter((m) => Boolean(m.id))
  const createBenchmark = useCreateBenchmark()

  const [matchType, setMatchType] = useState<'llm_vs_llm' | 'llm_vs_user'>('llm_vs_llm')
  const [modelAId, setModelAId] = useState('')
  const [modelBId, setModelBId] = useState('')
  const [llmModelId, setLlmModelId] = useState('')
  const [timeControl, setTimeControl] = useState('10+5')
  const [boardMode, setBoardMode] = useState<'assisted' | 'pure'>('assisted')
  const [startingPosition, setStartingPosition] = useState<'standard' | 'chess960'>('standard')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [created, setCreated] = useState(false)

  // Pick sensible registry defaults the first time models arrive.
  const [defaultsSet, setDefaultsSet] = useState(false)
  if (!defaultsSet && models.length >= 2 && !modelAId && !modelBId && !llmModelId) {
    setModelAId(models[0].id!)
    setModelBId(models[1].id!)
    setLlmModelId(models[0].id!)
    setDefaultsSet(true)
  }

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError('')
      setCreated(false)
      const input: BenchmarkCreateInput = {
        boardMode,
        matchType,
        startingPosition,
        timeControl,
        title: title.trim() || undefined,
        visibility,
      }
      if (matchType === 'llm_vs_llm') {
        input.playerAModelId = modelAId
        input.playerBModelId = modelBId
      } else {
        input.llmModelId = llmModelId
      }
      try {
        const benchmark = await createBenchmark.mutateAsync(input)
        setCreated(true)
        setTitle('')
        onCreated?.(benchmark)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create benchmark')
      }
    },
    [boardMode, createBenchmark, matchType, modelAId, modelBId, llmModelId, onCreated, startingPosition, timeControl, title, visibility],
  )

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-emerald-500/20 bg-[#161d2a] p-4 shadow-lg">
      <h3 className="flex items-center gap-2 text-sm font-bold text-white">
        <Plus className="h-4 w-4 text-emerald-400" />
        New benchmark
      </h3>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <span className={labelClass}>Match type</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {([
              { value: 'llm_vs_llm', label: 'LLM vs LLM', hint: 'Two registered models compete' },
              { value: 'llm_vs_user', label: 'LLM vs User', hint: 'You play against one model' },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMatchType(opt.value)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  matchType === opt.value
                    ? 'border-emerald-500/50 bg-emerald-600/15'
                    : 'border-[#2e3c54] bg-[#111620] hover:bg-[#1a2230]'
                }`}
              >
                <span className={`text-xs font-bold ${matchType === opt.value ? 'text-emerald-300' : 'text-slate-200'}`}>
                  {opt.label}
                </span>
                <span className="block text-[10px] text-slate-500">{opt.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {matchType === 'llm_vs_llm' ? (
          <>
            <label className={labelClass}>
              Model A (White on game 1)
              <select value={modelAId} onChange={(e) => setModelAId(e.target.value)} className={`mt-1 ${selectClass}`}>
                {models.map((m) => (
                  <option key={`a-${m.id}`} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Model B (Black on game 1)
              <select value={modelBId} onChange={(e) => setModelBId(e.target.value)} className={`mt-1 ${selectClass}`}>
                {models.map((m) => (
                  <option key={`b-${m.id}`} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className={labelClass}>
            Your opponent (LLM)
            <select value={llmModelId} onChange={(e) => setLlmModelId(e.target.value)} className={`mt-1 ${selectClass}`}>
              {models.map((m) => (
                <option key={`l-${m.id}`} value={m.id}>
                  {m.name} ({m.provider})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={labelClass}>
          Time control
          <select
            value={timeControl}
            onChange={(e) => setTimeControl(e.target.value)}
            className={`mt-1 ${selectClass}`}
          >
            {TIME_CONTROL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Board mode
          <select
            value={boardMode}
            // SAFETY: the option values below are hardcoded to this union
            onChange={(e) => setBoardMode(e.target.value as 'assisted' | 'pure')}
            className={`mt-1 ${selectClass}`}
          >
            <option value="assisted">Assisted (legal moves shown)</option>
            <option value="pure">Pure (no legal moves)</option>
          </select>
        </label>
        <label className={labelClass}>
          Starting position
          <select
            value={startingPosition}
            // SAFETY: the option values below are hardcoded to this union
            onChange={(e) => setStartingPosition(e.target.value as 'standard' | 'chess960')}
            className={`mt-1 ${selectClass}`}
          >
            <option value="standard">Standard chess</option>
            <option value="chess960">Chess960</option>
          </select>
        </label>
        <label className={labelClass}>
          Visibility
          <select
            value={visibility}
            // SAFETY: the option values below are hardcoded to this union
            onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}
            className={`mt-1 ${selectClass}`}
          >
            <option value="public">Public (appears in global history)</option>
            <option value="private">Private (hidden from history)</option>
          </select>
        </label>

        <label className={labelClass}>
          Title (optional)
          <input
            value={title}
            maxLength={120}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. gpt-4o vs claude — opening research"
            className="mt-1 h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {created && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Benchmark created — press <strong className="mx-1">Start</strong> on the row below to launch the match.
        </p>
      )}

      <button
        type="submit"
        disabled={createBenchmark.isPending}
        className="mt-3 flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {createBenchmark.isPending ? 'Creating…' : 'Create benchmark'}
      </button>
    </form>
  )
}
