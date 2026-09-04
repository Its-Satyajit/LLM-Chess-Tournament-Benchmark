'use client'

import React, { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  TrendingUp,
  Cpu,
  Clock,
  Zap,
  Filter,
  Search,
  ArrowUpDown,
  AlertTriangle,
  Radio,
  Swords,
  Layers,
} from 'lucide-react'
import { useBenchmarkMetrics, type ModelBenchmarkData } from '../lib/queries'

type SortField =
  | 'rating'
  | 'avgAccuracy'
  | 'blunderRate'
  | 'winRate'
  | 'avgThinkTimeSeconds'
  | 'avgTokensPerMove'
  | 'gamesPlayed'

type SortDirection = 'asc' | 'desc'

interface ProviderStyle {
  badgeClass: string
  color: string
}

const PROVIDER_CONFIG = {
  anthropic: { badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30', color: '#f59e0b' },
  google: { badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30', color: '#3b82f6' },
  groq: { badgeClass: 'bg-pink-500/15 text-pink-400 border-pink-500/30', color: '#ec4899' },
  meta: { badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', color: '#06b6d4' },
  mistral: { badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30', color: '#8b5cf6' },
  ollama: { badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', color: '#10b981' },
  openai: { badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', color: '#10b981' },
} satisfies Record<string, ProviderStyle>

const DEFAULT_PROVIDER_STYLE: ProviderStyle = {
  badgeClass: 'bg-slate-700/30 text-slate-300 border-slate-700',
  color: '#38bdf8',
}

function getProviderStyle(provider: string): ProviderStyle {
  const p = provider.toLowerCase()
  if (p in PROVIDER_CONFIG) {
    // SAFETY: p confirmed to be key of PROVIDER_CONFIG
    return PROVIDER_CONFIG[p as keyof typeof PROVIDER_CONFIG]
  }
  return DEFAULT_PROVIDER_STYLE
}

const CLASSIFICATION_COLORS = {
  best: '#10b981',
  blunder: '#f43f5e',
  brilliant: '#06b6d4',
  excellent: '#14b8a6',
  good: '#3b82f6',
  inaccuracy: '#f59e0b',
  miss: '#ea580c',
  mistake: '#f97316',
} as const

// --- Chart 1: Elo vs Move Accuracy Scatter Plot ---
const EloAccuracyScatterChart = React.memo(function EloAccuracyScatterChart({
  models,
}: {
  models: ModelBenchmarkData[]
}) {
  const evaluated = useMemo(() => models.filter((m) => m.avgAccuracy !== null), [models])

  if (evaluated.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-500">
        No games evaluated with Stockfish yet. Run game reviews to populate this chart.
      </div>
    )
  }

  const minRating = Math.min(...evaluated.map((m) => m.rating)) - 100
  const maxRating = Math.max(...evaluated.map((m) => m.rating)) + 100
  const minAcc = Math.max(0, Math.min(...evaluated.map((m) => m.avgAccuracy ?? 70)) - 5)
  const maxAcc = Math.min(100, Math.max(...evaluated.map((m) => m.avgAccuracy ?? 100)) + 5)

  const width = 500
  const height = 240
  const pad = { bottom: 35, left: 55, right: 30, top: 25 }

  const scaleX = (acc: number) => {
    const range = maxAcc - minAcc || 1
    return pad.left + ((acc - minAcc) / range) * (width - pad.left - pad.right)
  }

  const scaleY = (rating: number) => {
    const range = maxRating - minRating || 1
    return height - pad.bottom - ((rating - minRating) / range) * (height - pad.top - pad.bottom)
  }

  return (
    <div className="relative overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + t * (height - pad.top - pad.bottom)
          const val = Math.round(maxRating - t * (maxRating - minRating))
          return (
            <g key={`y-${t}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="#1f2838"
                strokeDasharray="3 3"
              />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                {val}
              </text>
            </g>
          )
        })}

        {[0, 0.5, 1].map((t) => {
          const x = pad.left + t * (width - pad.left - pad.right)
          const val = (minAcc + t * (maxAcc - minAcc)).toFixed(0)
          return (
            <g key={`x-${t}`}>
              <line
                x1={x}
                y1={pad.top}
                x2={x}
                y2={height - pad.bottom}
                stroke="#1f2838"
                strokeDasharray="3 3"
              />
              <text x={x} y={height - pad.bottom + 14} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                {val}%
              </text>
            </g>
          )
        })}

        {/* Axis Labels */}
        <text x={pad.left} y={14} fill="#94a3b8" fontSize="10" fontWeight="600">
          Elo Rating ↑
        </text>
        <text x={width - pad.right} y={height - 8} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="600">
          Move Accuracy % →
        </text>

        {/* Points */}
        {evaluated.map((m) => {
          const cx = scaleX(m.avgAccuracy ?? 80)
          const cy = scaleY(m.rating)
          const color = getProviderStyle(m.provider).color
          return (
            <g key={m.model} className="group cursor-pointer">
              <circle
                cx={cx}
                cy={cy}
                r={7}
                fill={color}
                fillOpacity={0.8}
                stroke="#0f172a"
                strokeWidth={2}
                className="transition-all group-hover:r-9 group-hover:stroke-white"
              />
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="9"
                fontWeight="bold"
                className="pointer-events-none drop-shadow"
              >
                {m.model}
              </text>
              <title>{`${m.model} (${m.provider})\nElo: ${m.rating}\nAccuracy: ${m.avgAccuracy}%\nEvaluated Games: ${m.evaluatedGamesCount}`}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
})

// --- Chart 2: Move Classification Distribution (Stacked Horizontal Bars via SVG) ---
const MoveClassificationDistributionChart = React.memo(function MoveClassificationDistributionChart({
  models,
}: {
  models: ModelBenchmarkData[]
}) {
  const modelsWithMoves = useMemo(
    () =>
      models.filter((m) => {
        const sum = Object.values(m.classifications).reduce((a, b) => a + b, 0)
        return sum > 0
      }),
    [models],
  )

  if (modelsWithMoves.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-slate-500">
        No move classifications recorded yet. Run game reviews to view move quality breakdown.
      </div>
    )
  }

  const keys: (keyof typeof CLASSIFICATION_COLORS)[] = [
    'brilliant',
    'best',
    'excellent',
    'good',
    'inaccuracy',
    'mistake',
    'miss',
    'blunder',
  ]

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-300">
        {keys.map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <svg width="8" height="8" className="inline-block">
              <circle cx="4" cy="4" r="4" fill={CLASSIFICATION_COLORS[k]} />
            </svg>
            <span className="capitalize">{k}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2.5">
        {modelsWithMoves.map((m) => {
          const total = Object.values(m.classifications).reduce((a, b) => a + b, 0)
          if (total === 0) return null

          let accumulatedPct = 0
          return (
            <div key={m.model} className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="font-semibold text-slate-200">{m.model}</span>
                <span className="text-slate-400 text-[11px]">{total} plies evaluated</span>
              </div>
              <svg viewBox="0 0 100 8" className="h-4 w-full rounded-md bg-[#0b0f17] border border-[#242f42]">
                {keys.map((k) => {
                  const count = m.classifications[k] ?? 0
                  const pct = (count / total) * 100
                  if (pct <= 0) return null
                  const x = accumulatedPct
                  accumulatedPct += pct
                  return (
                    <rect
                      key={k}
                      x={x}
                      y={0}
                      width={pct}
                      height={8}
                      fill={CLASSIFICATION_COLORS[k]}
                      className="transition-all hover:opacity-80 cursor-pointer"
                    >
                      <title>{`${m.model} - ${k}: ${count} (${pct.toFixed(1)}%)`}</title>
                    </rect>
                  )
                })}
              </svg>
            </div>
          )
        })}
      </div>
    </div>
  )
})

// --- Chart 3: Think Time vs. Blunder Rate ---
const ThinkTimeBlunderChart = React.memo(function ThinkTimeBlunderChart({
  models,
}: {
  models: ModelBenchmarkData[]
}) {
  const width = 500
  const height = 240
  const pad = { bottom: 35, left: 55, right: 30, top: 25 }

  const maxThink = Math.max(5, ...models.map((m) => m.avgThinkTimeSeconds)) + 1
  const maxBlunder = Math.max(5, ...models.map((m) => m.blunderRate)) + 1

  const scaleX = (time: number) =>
    pad.left + (time / maxThink) * (width - pad.left - pad.right)

  const scaleY = (blunder: number) =>
    height - pad.bottom - (blunder / maxBlunder) * (height - pad.top - pad.bottom)

  return (
    <div className="relative overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad.top + t * (height - pad.top - pad.bottom)
          const val = (maxBlunder - t * maxBlunder).toFixed(1)
          return (
            <g key={`y-${t}`}>
              <line
                x1={pad.left}
                y1={y}
                x2={width - pad.right}
                y2={y}
                stroke="#1f2838"
                strokeDasharray="3 3"
              />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                {val}%
              </text>
            </g>
          )
        })}

        {[0, 0.5, 1].map((t) => {
          const x = pad.left + t * (width - pad.left - pad.right)
          const val = (t * maxThink).toFixed(1)
          return (
            <g key={`x-${t}`}>
              <line
                x1={x}
                y1={pad.top}
                x2={x}
                y2={height - pad.bottom}
                stroke="#1f2838"
                strokeDasharray="3 3"
              />
              <text x={x} y={height - pad.bottom + 14} textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                {val}s
              </text>
            </g>
          )
        })}

        {/* Labels */}
        <text x={pad.left} y={14} fill="#94a3b8" fontSize="10" fontWeight="600">
          Blunder Rate % ↑ (Lower is better)
        </text>
        <text x={width - pad.right} y={height - 8} textAnchor="end" fill="#94a3b8" fontSize="10" fontWeight="600">
          Avg Think Time (seconds) →
        </text>

        {models.map((m) => {
          const cx = scaleX(m.avgThinkTimeSeconds)
          const cy = scaleY(m.blunderRate)
          const color = getProviderStyle(m.provider).color
          return (
            <g key={m.model} className="group cursor-pointer">
              <circle
                cx={cx}
                cy={cy}
                r={7}
                fill={color}
                fillOpacity={0.8}
                stroke="#0f172a"
                strokeWidth={2}
                className="transition-all group-hover:r-9 group-hover:stroke-white"
              />
              <text
                x={cx}
                y={cy - 10}
                textAnchor="middle"
                fill="#cbd5e1"
                fontSize="9"
                fontWeight="bold"
                className="pointer-events-none drop-shadow"
              >
                {m.model}
              </text>
              <title>{`${m.model}\nThink Time: ${m.avgThinkTimeSeconds}s\nBlunder Rate: ${m.blunderRate}%`}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
})

// --- Chart 4: Token Efficiency by Model ---
const TokenEfficiencyChart = React.memo(function TokenEfficiencyChart({
  models,
}: {
  models: ModelBenchmarkData[]
}) {
  const maxTokens = Math.max(300, ...models.map((m) => m.avgTokensPerMove)) * 1.15
  const barHeight = 24
  const gap = 12
  const height = Math.max(160, models.length * (barHeight + gap) + 40)
  const width = 500
  const labelWidth = 140
  const chartWidth = width - labelWidth - 50

  return (
    <div className="relative overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {models.map((m, i) => {
          const y = 20 + i * (barHeight + gap)
          const barW = Math.max(4, (m.avgTokensPerMove / maxTokens) * chartWidth)
          const color = getProviderStyle(m.provider).color

          return (
            <g key={m.model} className="group cursor-pointer">
              <text
                x={labelWidth - 10}
                y={y + 16}
                textAnchor="end"
                fill="#cbd5e1"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {m.model}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={chartWidth}
                height={barHeight}
                rx={4}
                fill="#111620"
                stroke="#1e293b"
              />
              <rect
                x={labelWidth}
                y={y}
                width={barW}
                height={barHeight}
                rx={4}
                fill={color}
                fillOpacity={0.85}
                className="transition-all group-hover:fill-opacity-100"
              />
              <text
                x={labelWidth + barW + 8}
                y={y + 16}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {m.avgTokensPerMove} tok/move
              </text>
              <title>{`${m.model}\nAverage: ${m.avgTokensPerMove} tokens/move\nTotal Tokens Used: ${m.totalTokensUsed.toLocaleString()}`}</title>
            </g>
          )
        })}
      </svg>
    </div>
  )
})

function SortableHeader({
  field,
  label,
  onSort,
}: {
  field: SortField
  label: string
  onSort: (f: SortField) => void
}) {
  const handleClick = useCallback(() => {
    onSort(field)
  }, [field, onSort])

  return (
    <th className="py-2.5 px-3 cursor-pointer select-none" onClick={handleClick}>
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <ArrowUpDown className="h-3 w-3 text-slate-500" />
      </div>
    </th>
  )
}

export default function Benchmark() {
  const { data, isLoading, error, refetch } = useBenchmarkMetrics()

  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('rating')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const providers = useMemo(() => {
    if (!data?.models) return []
    const set = new Set(data.models.map((m) => m.provider))
    return Array.from(set).sort()
  }, [data])

  const handleSort = useCallback((field: SortField) => {
    setSortField((current) => {
      if (current === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return current
      }
      setSortDir('desc')
      return field
    })
  }, [])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleProviderChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setProviderFilter(e.target.value)
  }, [])

  const handleRetry = useCallback(() => {
    void refetch()
  }, [refetch])

  const filteredAndSortedModels = useMemo(() => {
    if (!data?.models) return []

    return data.models
      .filter((m) => {
        const matchesSearch =
          m.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.provider.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesProvider =
          providerFilter === 'all' || m.provider.toLowerCase() === providerFilter.toLowerCase()
        return matchesSearch && matchesProvider
      })
      .sort((a, b) => {
        const valA = a[sortField] ?? -999999
        const valB = b[sortField] ?? -999999

        if (Number.isFinite(valA) && Number.isFinite(valB)) {
          // SAFETY: Number.isFinite asserts valA and valB are valid numbers
          return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number)
        }
        return 0
      })
  }, [data, searchQuery, providerFilter, sortField, sortDir])

  if (isLoading) {
    return (
      <div className="py-24 text-center text-xs text-slate-400" aria-busy="true">
        <Cpu className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-400" />
        Loading benchmark analytics matrix...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-[#161d2a] p-8 text-center space-y-4">
        <AlertTriangle className="mx-auto h-8 w-8 text-rose-400" />
        <h3 className="text-sm font-bold text-rose-300">Failed to load benchmark analytics</h3>
        <p className="text-xs text-slate-400">
          The database could not be reached or benchmark metrics are not initialized.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Stat Overview Cards */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242f42] pb-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-emerald-400" />
            <span>Benchmark Analytics Matrix</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Cross-model evaluation across Elo rating, Stockfish accuracy, move classifications, and token economics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-[#1a2230]"
          >
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <span>Live Arena</span>
          </Link>
          <Link
            href="/history"
            className="flex items-center gap-1.5 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-[#1a2230]"
          >
            <Swords className="h-3.5 w-3.5 text-slate-400" />
            <span>Match History</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Matches</div>
          <div className="mt-1 text-2xl font-black font-mono text-white">{data.totalMatches} Matches</div>
          <div className="text-[10px] text-slate-500">Persisted in SQLite database</div>
        </div>

        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Games</div>
          <div className="mt-1 text-2xl font-black font-mono text-emerald-400">{data.totalGames} Games</div>
          <div className="text-[10px] text-slate-500">Across all tournament matches</div>
        </div>

        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Evaluated Games</div>
          <div className="mt-1 text-2xl font-black font-mono text-cyan-400">{data.evaluatedGames} Evaluated</div>
          <div className="text-[10px] text-slate-500">Deep Stockfish review completed</div>
        </div>

        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Models</div>
          <div className="mt-1 text-2xl font-black font-mono text-amber-400">{data.models.length} Models</div>
          <div className="text-[10px] text-slate-500">Competing in rating ladder</div>
        </div>
      </div>

      {/* 4 Interactive Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Chart 1: Elo vs Move Accuracy */}
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-[#242f42] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              <span>Elo vs Move Accuracy</span>
            </h2>
            <span className="text-[11px] text-slate-500">Stockfish 16 Correlation</span>
          </div>
          <EloAccuracyScatterChart models={filteredAndSortedModels} />
        </div>

        {/* Chart 2: Move Classification Distribution */}
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-[#242f42] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Move Classification Distribution</span>
            </h2>
            <span className="text-[11px] text-slate-500">Brilliant → Blunder Ratio</span>
          </div>
          <MoveClassificationDistributionChart models={filteredAndSortedModels} />
        </div>

        {/* Chart 3: Think Time vs. Blunder Rate */}
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-[#242f42] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Think Time vs Blunder Rate</span>
            </h2>
            <span className="text-[11px] text-slate-500">Efficiency Frontier</span>
          </div>
          <ThinkTimeBlunderChart models={filteredAndSortedModels} />
        </div>

        {/* Chart 4: Token Efficiency & Consumption */}
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-[#242f42] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-purple-400" />
              <span>Token Efficiency & Consumption</span>
            </h2>
            <span className="text-[11px] text-slate-500">Tokens / Move</span>
          </div>
          <TokenEfficiencyChart models={filteredAndSortedModels} />
        </div>
      </div>

      {/* Filterable, Sortable Benchmark Metrics Matrix Table */}
      <div className="rounded-xl border border-[#242f42] bg-[#161d2a] shadow-md overflow-hidden space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242f42] pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Comprehensive Model Benchmark Matrix
            </h2>
            <p className="text-[11px] text-slate-400">
              Sort and filter tournament participants across all performance axes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search model or provider..."
                className="rounded-lg border border-[#242f42] bg-[#111620] pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            {/* Provider Filter */}
            <div className="flex items-center gap-1 bg-[#111620] border border-[#242f42] rounded-lg px-2 py-1 text-xs">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                aria-label="Filter provider"
                value={providerFilter}
                onChange={handleProviderChange}
                className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer"
              >
                <option value="all" className="bg-[#161d2a]">All Providers</option>
                {providers.map((p) => (
                  <option key={p} value={p} className="bg-[#161d2a]">
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#111620] text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-[#242f42]">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Provider</th>
                <SortableHeader field="rating" label="Elo Rating" onSort={handleSort} />
                <SortableHeader field="avgAccuracy" label="Accuracy" onSort={handleSort} />
                <SortableHeader field="blunderRate" label="Blunder %" onSort={handleSort} />
                <SortableHeader field="winRate" label="Win Rate" onSort={handleSort} />
                <SortableHeader field="avgThinkTimeSeconds" label="Think Time" onSort={handleSort} />
                <SortableHeader field="avgTokensPerMove" label="Tokens/Move" onSort={handleSort} />
                <th className="py-2.5 px-3 text-right">W - D - L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2838] font-mono">
              {filteredAndSortedModels.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-xs text-slate-500 font-sans">
                    No models matched the search criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedModels.map((m, idx) => (
                  <tr key={m.model} className="hover:bg-[#111620]/60 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500 font-sans font-bold">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-sans font-bold text-white">{m.model}</td>
                    <td className="py-2.5 px-3">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${getProviderStyle(m.provider).badgeClass}`}>
                        {m.provider}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">
                      {m.rating} <span className="text-[10px] text-slate-500 font-normal">±{m.rd}</span>
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                      {m.avgAccuracy !== null ? `${m.avgAccuracy.toFixed(1)}%` : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-rose-400 font-semibold">
                      {m.blunderRate.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">
                      {m.winRate}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {m.avgThinkTimeSeconds}s
                    </td>
                    <td className="py-2.5 px-3 text-purple-300">
                      {m.avgTokensPerMove}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400 text-[11px]">
                      {m.wins} - {m.draws} - {m.losses}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
