'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Ban,
  Bot,
  ExternalLink,
  LayoutDashboard,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  User,
  X,
} from 'lucide-react'
import BenchmarkCreateForm from '../components/benchmarks/BenchmarkCreateForm'
import UserPlayPanel from '../components/benchmarks/UserPlayPanel'
import {
  useCancelBenchmark,
  useDeleteBenchmark,
  useMyBenchmarks,
  useStartBenchmark,
} from '../lib/queries'
import type { BenchmarkParticipant, BenchmarkStatus, BenchmarkSummary } from '../lib/api'
import { useSession } from '../lib/auth-client'

const STATUS_STYLES = {
  cancelled: 'bg-slate-700/70 text-slate-400',
  completed: 'bg-emerald-500/20 text-emerald-300',
  created: 'bg-slate-700 text-slate-200',
  failed: 'bg-rose-500/20 text-rose-300',
  running: 'bg-amber-500/20 text-amber-300',
} satisfies Record<BenchmarkStatus, string>

function participantName(p: BenchmarkParticipant): string {
  return p.kind === 'model' ? p.model.name : p.publicName
}

function participantIcon(p: BenchmarkParticipant) {
  return p.kind === 'model' ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Dashboard() {
  const router = useRouter()
  const { data: session } = useSession()
  const { data, isLoading, isError, error, refetch } = useMyBenchmarks()
  const benchmarks = data ?? []
  const [showCreate, setShowCreate] = useState(false)

  const startMutation = useStartBenchmark()
  const cancelMutation = useCancelBenchmark()
  const deleteMutation = useDeleteBenchmark()

  const doRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const toggleCreate = useCallback(() => {
    setShowCreate((v) => !v)
  }, [])

  const handleStart = useCallback(
    (id: string) => {
      startMutation.mutate(id)
    },
    [startMutation],
  )
  const handleCancel = useCallback(
    (id: string) => {
      cancelMutation.mutate(id)
    },
    [cancelMutation],
  )
  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id)
    },
    [deleteMutation],
  )
  const openInArena = useCallback(
    (matchId: string) => {
      localStorage.setItem('arena.lastMatchId', matchId)
      router.push('/')
    },
    [router],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242f42] pb-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
            <LayoutDashboard className="h-5 w-5 text-emerald-400" />
            <span>My Benchmarks</span>
            {!isLoading && (
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
                {benchmarks.length}
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {session?.user ? `Signed in as ${session.user.name}. ` : ''}
            Your private runs — the global{' '}
            <Link className="text-emerald-400 underline" href="/history">
              Public History
            </Link>{' '}
            stays separate.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={doRefresh}
            className="flex items-center gap-1.5 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-[#1a2230] hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={toggleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
          >
            {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showCreate ? 'Close' : 'New Benchmark'}
          </button>
        </div>
      </div>

      {showCreate && <BenchmarkCreateForm />}

      {isLoading && (
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-8 text-center text-xs text-slate-400" aria-busy="true">
          Loading your benchmarks…
        </div>
      )}
      {isError && (
        <div role="alert" className="rounded-xl border border-rose-500/30 bg-[#161d2a] p-4 text-center text-xs text-rose-300">
          Failed to load benchmarks: {error instanceof Error ? error.message : 'unknown error'}
        </div>
      )}
      {!isLoading && !isError && benchmarks.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#2e3c54] bg-[#161d2a] p-10 text-center text-xs text-slate-400">
          You have no benchmarks yet. Create an <span className="text-emerald-400 font-semibold">LLM vs LLM</span> or{' '}
          <span className="text-emerald-400 font-semibold">LLM vs User</span> run to get started.
        </div>
      )}

      <ul className="space-y-3">
        {benchmarks.map((b) => (
          <BenchmarkCard
            key={b.id}
            benchmark={b}
            onCancel={handleCancel}
            onDelete={handleDelete}
            onOpenInArena={openInArena}
            onStart={handleStart}
          />
        ))}
      </ul>
    </div>
  )
}

function BenchmarkCard({
  benchmark: b,
  onCancel,
  onDelete,
  onOpenInArena,
  onStart,
}: {
  benchmark: BenchmarkSummary
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  onOpenInArena: (matchId: string) => void
  onStart: (id: string) => void
}) {
  const [showPlay, setShowPlay] = useState(false)
  const [rowError, setRowError] = useState('')

  const typeLabel = b.matchType === 'llm_vs_user' ? 'LLM vs User' : 'LLM vs LLM'
  const sideA = b.participants.playerA
  const sideB = b.participants.playerB
  const humanSide = b.matchType === 'llm_vs_user' && sideA.kind === 'user' ? sideA : sideB
  const isHumanRun = b.matchType === 'llm_vs_user'
  const canStart = b.status === 'created'
  const isRunning = b.status === 'running'
  const canDelete = !isRunning && b.status !== 'completed'

  const startNow = useCallback(() => onStart(b.id), [b.id, onStart])
  const cancelNow = useCallback(() => onCancel(b.id), [b.id, onCancel])
  const togglePlay = useCallback(() => setShowPlay((v) => !v), [])
  const openArenaNow = useCallback(() => {
    if (b.matchId) onOpenInArena(b.matchId)
  }, [b.matchId, onOpenInArena])

  const deleteNow = useCallback(() => {
    if (b.status !== 'created' && b.status !== 'cancelled' && b.status !== 'failed') return
    // Deleting a benchmark row is permanent; require explicit confirmation.
    const ok = window.confirm(`Delete benchmark ${b.id}?`)
    if (!ok) return
    try {
      onDelete(b.id)
    } catch {
      setRowError('Failed to delete benchmark')
    }
  }, [b.id, b.status, onDelete])

  const resultText =
    b.result && b.matchId
      ? `${participantName(sideA)} ${b.result.playerAWins} – ${b.result.playerBWins} ${participantName(sideB)} (${b.result.draws} draws)`
      : null

  return (
    <li className="overflow-hidden rounded-xl border border-[#242f42] bg-[#161d2a] shadow-md">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500">{b.id}</span>
            <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[b.status]}`}>
              {b.status}
            </span>
            <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              {typeLabel}
            </span>
            {b.isPrivate && (
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">private</span>
            )}
          </div>

          {b.title && <p className="mt-1 text-xs font-bold text-white">{b.title}</p>}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="flex items-center gap-1 rounded bg-[#111620] px-2 py-0.5 font-bold text-white">
              {participantIcon(sideA)}
              {participantName(sideA)}
            </span>
            <span className="text-slate-500">vs</span>
            <span className="flex items-center gap-1 rounded bg-[#111620] px-2 py-0.5 font-bold text-white">
              {participantIcon(sideB)}
              {participantName(sideB)}
            </span>
            {isHumanRun && humanSide.kind === 'user' && (
              <span className="text-[10px] text-slate-500">(you are {humanSide.publicName})</span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-500">
            <span>
              {b.config.timeControl} · {b.config.boardMode} · {b.config.startingPosition} · 4 games
            </span>
            <span>created {formatDate(b.createdAt)}</span>
            {b.startedAt && <span>started {formatDate(b.startedAt)}</span>}
            {b.completedAt && <span>completed {formatDate(b.completedAt)}</span>}
          </div>

          {resultText && <p className="mt-1 text-xs font-semibold text-emerald-400">{resultText}</p>}
          {b.error && <p className="mt-1 text-xs text-rose-400">{b.error}</p>}
          {rowError && <p className="mt-1 text-xs text-rose-400">{rowError}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {canStart && (
            <button
              type="button"
              onClick={startNow}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
            >
              <Play className="h-3 w-3 fill-current" />
              Start
            </button>
          )}
          {b.matchId && (isRunning || b.status === 'completed') && (
            <button
              type="button"
              onClick={openArenaNow}
              className="flex items-center gap-1 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-[#1a2230]"
            >
              <ExternalLink className="h-3 w-3" />
              {isRunning ? 'Watch live' : 'View match'}
            </button>
          )}
          {isRunning && isHumanRun && b.matchId && (
            <button
              type="button"
              onClick={togglePlay}
              className="rounded-lg border border-emerald-500/40 bg-emerald-600/15 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-600/25"
            >
              {showPlay ? 'Hide play' : 'Play your side'}
            </button>
          )}
          {canStart && (
            <button
              type="button"
              onClick={cancelNow}
              title="Cancel this unstarted benchmark"
              className="flex items-center gap-1 rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-[#1a2230]"
            >
              <Ban className="h-3 w-3" />
              Cancel
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={deleteNow}
              title="Delete benchmark record"
              className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          )}
          {b.status === 'completed' && (
            <Link
              href="/history"
              className="flex items-center gap-1 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-[#1a2230]"
            >
              <ExternalLink className="h-3 w-3" />
              In public history
            </Link>
          )}
        </div>
      </div>

      {showPlay && isRunning && b.matchId && (
        <div className="border-t border-[#242f42] px-4 py-3">
          <UserPlayPanel benchmark={b} />
        </div>
      )}
    </li>
  )
}
