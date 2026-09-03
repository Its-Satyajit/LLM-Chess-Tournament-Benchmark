'use client'

import { useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { History as HistoryIcon, Search, Play, Film, ChevronDown, ChevronRight, Clock } from 'lucide-react'
import { listMatches, type HistoryGame, type HistoryMatch } from '../lib/api'

type StatusFilter = 'all' | 'active' | 'completed'

function matchScore(match: HistoryMatch): { a: number; b: number } {
  let a = 0
  let b = 0
  for (const g of match.games) {
    if (g.result?.winner === 'white') a++
    else if (g.result?.winner === 'black') b++
  }
  return { a, b }
}

function statusBadge(status: HistoryGame['status']): { className: string; label: string } {
  if (status === 'active') return { className: 'bg-amber-500/20 text-amber-300', label: 'active' }
  if (status === 'completed') return { className: 'bg-emerald-500/20 text-emerald-300', label: 'completed' }
  return { className: 'bg-slate-700 text-slate-300', label: 'pending' }
}

function resultLabel(game: HistoryGame): string {
  if (game.status === 'pending') return '—'
  if (!game.result) return game.status === 'active' ? 'in play' : 'no result'
  if (game.result.winner === 'white') return 'white won'
  if (game.result.winner === 'black') return 'black won'
  return `draw · ${game.result.reason}`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  try {
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
    })
  } catch {
    // Some locales reject the combined options (e.g. zh-HK). Fall back to
    // explicit fields which are universally supported.
    return d.toLocaleString(undefined, {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }
}

export default function History() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryFn: listMatches,
    queryKey: ['match-history'],
    refetchOnWindowFocus: false,
    staleTime: 5_000,
  })

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const matches = data ?? []

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return matches.filter((m) => {
      if (status !== 'all' && m.status !== status) return false
      if (!q) return true
      return (
        m.id.toLowerCase().includes(q) ||
        m.playerAModel.name.toLowerCase().includes(q) ||
        m.playerBModel.name.toLowerCase().includes(q) ||
        m.playerAModel.provider.toLowerCase().includes(q) ||
        m.playerBModel.provider.toLowerCase().includes(q)
      )
    })
  }, [matches, query, status])

  const toggleExpand = useCallback((matchId: string) => {
    setExpanded((prev) => ({ ...prev, [matchId]: !prev[matchId] }))
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242f42] pb-3">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
          <HistoryIcon className="h-5 w-5 text-emerald-400" />
          <span>Match History</span>
          {!isLoading && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
              {matches.length}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => void refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-[#1a2230] hover:text-white"
        >
          <Play className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by match id, model, or provider…"
            className="h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            aria-label="Filter matches"
          />
        </label>
        <div className="flex overflow-hidden rounded-lg border border-[#2e3c54] text-xs font-semibold">
          {(['all', 'active', 'completed'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 transition ${
                status === s
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[#111620] text-slate-300 hover:bg-[#1a2230]'
              }`}
            >
              {s[0]?.toUpperCase()}{s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {isLoading && (
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-8 text-center text-xs text-slate-400" aria-busy="true">
          Loading match history…
        </div>
      )}
      {isError && (
        <div className="rounded-xl border border-rose-500/30 bg-[#161d2a] p-4 text-center text-xs text-rose-300" role="alert">
          <p className="mb-2">Failed to load history: {error instanceof Error ? error.message : 'unknown error'}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded bg-rose-600/20 px-3 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30"
          >
            Retry
          </button>
        </div>
      )}
      {!isLoading && !isError && matches.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#2e3c54] bg-[#161d2a] p-8 text-center text-xs text-slate-400">
          No matches yet. Create one from the <Link href="/admin" className="text-emerald-400 underline">Admin</Link> page.
        </div>
      )}
      {!isLoading && !isError && matches.length > 0 && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#2e3c54] bg-[#161d2a] p-6 text-center text-xs text-slate-400">
          No matches match the current filter.
        </div>
      )}

      {/* Match list */}
      <ul className="space-y-2">
        {filtered.map((m) => {
          const score = matchScore(m)
          const isOpen = expanded[m.id] ?? false
          const completedGames = m.games.filter((g) => g.status === 'completed').length
          const inProgress = m.games.find((g) => g.status === 'active')
          return (
            <li
              key={m.id}
              className="overflow-hidden rounded-xl border border-[#242f42] bg-[#161d2a] shadow-md"
            >
              <div className="flex flex-wrap items-center gap-3 p-3.5">
                <button
                  type="button"
                  onClick={() => toggleExpand(m.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#2e3c54] bg-[#111620] text-slate-300 transition hover:bg-[#1a2230] hover:text-white"
                  aria-label={isOpen ? `Collapse ${m.id}` : `Expand ${m.id}`}
                  aria-expanded={isOpen}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{m.id}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        m.status === 'active'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {m.status}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {m.timeControl}
                    </span>
                    {inProgress && (
                      <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        Game {inProgress.gameNumber} in play
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded bg-[#111620] px-2 py-0.5 font-bold text-white">
                      {m.playerAModel.name}
                    </span>
                    <span className="text-slate-500">vs</span>
                    <span className="rounded bg-[#111620] px-2 py-0.5 font-bold text-white">
                      {m.playerBModel.name}
                    </span>
                    {m.games.length > 0 && (
                      <span className="ml-1 font-mono text-emerald-400">
                        {score.a}–{score.b}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(m.createdAt)}
                  </span>
                  <span className="hidden sm:inline">{completedGames}/{m.games.length} games</span>
                </div>

                <Link
                  href={inProgress
                    ? `/replay/${m.id}/${inProgress.id}`
                    : `/replay/${m.id}/${m.games[0]?.id ?? ''}`}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-600/30"
                >
                  <Film className="h-3.5 w-3.5" />
                  <span>Replay</span>
                </Link>
              </div>

              {isOpen && (
                <div className="border-t border-[#242f42] bg-[#111620]/60 p-3">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Games in this match
                  </div>
                  <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {m.games.map((g) => {
                      const badge = statusBadge(g.status)
                      return (
                        <li
                          key={g.id}
                          className="flex items-center gap-2 rounded-lg border border-[#2e3c54] bg-[#0a0d12] px-3 py-2 text-xs"
                        >
                          <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-300">
                            #{g.gameNumber}
                          </span>
                          <span className="font-semibold text-slate-200">
                            {g.startingPosition === 'chess960' ? '960' : 'Std'}
                          </span>
                          <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${badge.className}`}>
                            {badge.label}
                          </span>
                          <span className="flex-1 truncate text-slate-400">
                            {resultLabel(g)} · {g.moveCount} mv
                          </span>
                          <Link
                            href={`/replay/${m.id}/${g.id}`}
                            className="flex items-center gap-1 rounded border border-emerald-500/30 bg-emerald-600/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-600/20"
                          >
                            <Film className="h-3 w-3" />
                            <span>Open</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
