'use client'

import {
  useState,
  useCallback,
  useMemo,
  type FocusEvent,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import Link from 'next/link'
import { useForm } from '@tanstack/react-form'
import {
  Settings,
  Plus,
  Trash2,
  Users,
  Play,
  Check,
  Copy,
  ArrowRight,
  AlertCircle,
  Cpu,
} from 'lucide-react'
import { useModels, useAddModel, useDeleteModel, useCreateMatch, type Model } from '../lib/queries'

type LoadState = 'loading' | 'loaded' | 'error'

const selectOnFocus = (e: FocusEvent<HTMLInputElement>) => {
  e.currentTarget.select()
}

const selectCanSubmit = (state: { canSubmit: boolean; isSubmitting: boolean }) =>
  [state.canSubmit, state.isSubmitting] as const

function autoDetectProvider(name: string): string {
  const lower = name.toLowerCase()
  if (lower.startsWith('gpt') || lower.startsWith('o1') || lower.startsWith('o3')) return 'openai'
  if (lower.startsWith('claude')) return 'anthropic'
  if (lower.startsWith('gemini')) return 'google'
  if (lower.startsWith('deepseek')) return 'deepseek'
  if (lower.startsWith('mistral') || lower.startsWith('mixtral')) return 'mistral'
  if (lower.startsWith('llama')) return 'meta'
  if (lower.startsWith('qwen')) return 'qwen'
  return 'custom'
}

function TokenRow({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
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
          className="flex items-center gap-1.5 rounded-lg border border-[#2e3c54] bg-[#1c2536] px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              <span>Copy</span>
            </>
          )}
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
  onDelete,
}: {
  model: Model
  index: number
  isSelected: boolean
  maxSelected: boolean
  onToggle: (index: number) => void
  onDelete?: (id: string) => void
}) {
  const handleClick = useCallback(() => {
    onToggle(index)
  }, [index, onToggle])

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (model.id && onDelete) {
        onDelete(model.id)
      }
    },
    [model.id, onDelete],
  )

  return (
    <div
      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition ${
        isSelected
          ? 'border-emerald-500 bg-emerald-950/30 text-white shadow-sm'
          : 'border-[#2e3c54] bg-[#111620] text-slate-300 hover:bg-[#1a2230]'
      }`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSelected}
        aria-label={`Select ${model.name} (${model.provider})`}
        className="flex flex-1 items-center justify-between text-left"
        title={maxSelected && !isSelected ? 'Deselect a model first — max 2' : undefined}
      >
        <div className="flex items-center gap-2">
          <Cpu className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span className="font-semibold text-slate-200">{model.name}</span>
        </div>
        <span className="mr-2 rounded bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">
          {model.provider}
        </span>
      </button>

      {model.id && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label={`Delete ${model.name}`}
          className="rounded p-1 text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-400"
          title="Delete model"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

function ModelNameFieldInput({
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
    <label className="flex-1 min-w-[140px] text-xs font-semibold text-slate-300">
      Model Name
      <input
        value={value}
        onBlur={onBlur}
        onChange={handleChange}
        placeholder="e.g., gpt-4o, claude-3-5-sonnet"
        className="mt-1 h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
      />
    </label>
  )
}

function ProviderFieldInput({
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
    <label className="flex-1 min-w-[120px] text-xs font-semibold text-slate-300">
      Provider
      <input
        value={value}
        onBlur={onBlur}
        onChange={handleChange}
        placeholder="openai, anthropic, google, custom"
        className="mt-1 h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none"
      />
    </label>
  )
}

export default function Admin() {
  const { data: modelsData, isLoading: isModelsLoading, isError: isModelsError, refetch: reloadModels } = useModels()
  const models = useMemo(() => modelsData ?? [], [modelsData])
  const modelsState: LoadState = isModelsLoading ? 'loading' : isModelsError ? 'error' : 'loaded'

  const addModelMutation = useAddModel()
  const deleteModelMutation = useDeleteModel()
  const createMatchMutation = useCreateMatch()

  const [modelError, setModelError] = useState('')
  const [modelSuccess, setModelSuccess] = useState('')
  const [matchResult, setMatchResult] = useState<{ matchId?: string; ok: boolean; text: string } | null>(null)
  const [createdTokens, setCreatedTokens] = useState<{ black: string; white: string } | null>(null)
  const [selectedModels, setSelectedModels] = useState<number[]>([])
  const [copiedToken, setCopiedToken] = useState<'A' | 'B' | null>(null)

  const selectedModelsSet = useMemo(() => new Set(selectedModels), [selectedModels])

  // TanStack Form setup for reliable model creation
  const form = useForm({
    defaultValues: {
      name: '',
      provider: '',
    },
    onSubmit: async ({ value }) => {
      const trimmedName = value.name.trim()
      if (!trimmedName) {
        setModelError('Please enter a model name (e.g. gpt-4o, claude-3-5-sonnet).')
        return
      }
      const resolvedProvider = value.provider.trim() || autoDetectProvider(trimmedName)

      setModelError('')
      setModelSuccess('')
      try {
        await addModelMutation.mutateAsync({ name: trimmedName, provider: resolvedProvider })
        form.reset()
        setModelSuccess(`Model "${trimmedName}" added successfully!`)
        setTimeout(() => setModelSuccess(''), 3500)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to register model'
        setModelError(msg)
      }
    },
  })

  const handleFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      e.stopPropagation()
      void form.handleSubmit()
    },
    [form],
  )

  const deleteModel = useCallback(
    async (id: string) => {
      try {
        await deleteModelMutation.mutateAsync(id)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to delete model'
        setModelError(msg)
      }
    },
    [deleteModelMutation],
  )

  const handleRetry = useCallback(() => {
    void reloadModels()
  }, [reloadModels])

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
    if (selectedModels.length !== 2 || createMatchMutation.isPending) return
    setMatchResult(null)
    setCreatedTokens(null)
    try {
      const mA = models[selectedModels[0]]
      const mB = models[selectedModels[1]]
      const data = await createMatchMutation.mutateAsync({
        playerAModel: { maxOutputTokens: 1000, name: mA.name, provider: mA.provider, temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 1000, name: mB.name, provider: mB.provider, temperature: 0.7, version: '1.0' },
      })
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
      const msg = err instanceof Error ? err.message : 'Failed to start match'
      setMatchResult({ ok: false, text: msg })
    }
  }, [selectedModels, models, createMatchMutation])

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#242f42] pb-3">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-emerald-400" />
          <h2 className="text-lg font-bold tracking-tight text-white">Tournament Admin & Models</h2>
        </div>
        <span className="text-xs text-slate-400">Configure benchmark participants</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Card 1: Registered Models */}
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200">Registered Models</h3>
            <p className="text-xs text-slate-400">Add an LLM model by name and API provider.</p>
          </div>

          {/* TanStack Form Component */}
          <form onSubmit={handleFormSubmit} className="flex flex-wrap items-end gap-2">
            <form.Field name="name">
              {(field) => (
                <ModelNameFieldInput
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>

            <form.Field name="provider">
              {(field) => (
                <ProviderFieldInput
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                />
              )}
            </form.Field>

            <form.Subscribe selector={selectCanSubmit}>
              {([canSubmit, isSubmitting]) => (
                <button
                  type="submit"
                  disabled={!canSubmit || isSubmitting || addModelMutation.isPending}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{isSubmitting || addModelMutation.isPending ? 'Adding...' : 'Add'}</span>
                </button>
              )}
            </form.Subscribe>
          </form>

          {modelError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{modelError}</span>
            </div>
          )}

          {modelSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check className="h-3.5 w-3.5 shrink-0" />
              <span>{modelSuccess}</span>
            </div>
          )}

          {modelsState === 'loading' && (
            <p className="text-xs text-slate-500" aria-busy="true">
              Loading models...
            </p>
          )}
          {modelsState === 'error' && (
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <span>Failed to load models.</span>
              <button type="button" onClick={handleRetry} className="underline">
                Retry
              </button>
            </div>
          )}

          <div className="space-y-1.5 pt-2 border-t border-[#242f42]">
            {models.map((m, i) => (
              <ModelRowItem
                key={`${m.provider}-${m.name}-${m.id || i}`}
                model={m}
                index={i}
                isSelected={selectedModelsSet.has(i)}
                maxSelected={selectedModels.length >= 2}
                onToggle={toggleModel}
                onDelete={deleteModel}
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
            <output aria-live="polite" className="flex items-center gap-2 text-slate-300">
              <Users className="h-4 w-4 text-slate-400" />
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
            disabled={selectedModels.length !== 2 || createMatchMutation.isPending}
            className="flex w-full h-9 items-center justify-center gap-2 rounded-lg bg-emerald-600 font-bold text-xs text-white shadow transition hover:bg-emerald-500 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>{createMatchMutation.isPending ? 'Creating Match...' : 'Start Match'}</span>
          </button>

          {matchResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2 text-center text-xs text-emerald-300">
              <output aria-live="polite">{matchResult.text}</output>
            </div>
          )}

          {createdTokens && (
            <div className="space-y-3 pt-2 border-t border-[#242f42]">
              <div className="text-xs font-semibold text-slate-300">Bearer Tokens</div>
              <TokenRow
                label="Player A (White Game 1)"
                value={createdTokens.white}
                copied={copiedToken === 'A'}
                onCopy={handleCopyA}
              />
              <TokenRow
                label="Player B (Black Game 1)"
                value={createdTokens.black}
                copied={copiedToken === 'B'}
                onCopy={handleCopyB}
              />
              <Link
                href="/"
                className="flex w-full h-8 items-center justify-center gap-1.5 rounded-lg border border-[#2e3c54] bg-[#1c2536] text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <span>Open in Arena</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
