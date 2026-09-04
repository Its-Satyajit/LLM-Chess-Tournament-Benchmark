'use client'

import React from 'react'
import {
  Sparkles,
  Zap,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ThumbsUp,
  Award,
  BookOpen,
  Sliders,
  Cpu,
} from 'lucide-react'
import {
  MOVE_CLASSIFICATIONS,
  getClassificationLabel,
  type MoveClassificationType,
} from '../lib/gameReview/metrics'
import type { GameReviewReport, ReviewProgress } from '../lib/gameReview/coordinator'

export type ReviewMode = 'tournament' | 'streamer'

export interface GameReviewCardProps {
  report: GameReviewReport | null
  isAnalyzing: boolean
  progress: ReviewProgress | null
  onStartReview: () => void
  mode: ReviewMode
  onToggleMode: () => void
  depth: number
  onChangeDepth: (depth: number) => void
  whitePlayerName?: string
  blackPlayerName?: string
}

const CLASSIFICATION_ORDER: MoveClassificationType[] = [
  'brilliant',
  'veryGood',
  'best',
  'excellent',
  'good',
  'theoretical',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
]

const CLASSIFICATION_ICONS = {
  best: <Award className="h-3.5 w-3.5 text-emerald-400" />,
  blunder: <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />,
  brilliant: <Sparkles className="h-3.5 w-3.5 text-cyan-400" />,
  excellent: <ThumbsUp className="h-3.5 w-3.5 text-teal-300" />,
  good: <CheckCircle2 className="h-3.5 w-3.5 text-blue-300" />,
  inaccuracy: <HelpCircle className="h-3.5 w-3.5 text-amber-300" />,
  miss: <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />,
  mistake: <AlertTriangle className="h-3.5 w-3.5 text-red-400" />,
  theoretical: <BookOpen className="h-3.5 w-3.5 text-violet-400" />,
  veryGood: <Zap className="h-3.5 w-3.5 text-lime-300" />,
} satisfies Record<MoveClassificationType, React.ReactNode>

function PlayerScorecard({
  name,
  icon,
  accuracy,
  rating,
  acpl,
}: {
  name: string
  icon: string
  accuracy: number
  rating: number
  acpl: number
}) {
  return (
    <div className="rounded-lg border border-[#242f42] bg-[#111620] p-3 text-center space-y-1">
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate">
        {icon} {name}
      </div>
      <div className="text-2xl font-black font-mono text-emerald-400">
        {accuracy.toFixed(1)}%
      </div>
      <div className="text-[10px] uppercase font-bold text-slate-500">Accuracy</div>
      <div className="pt-1 flex items-center justify-center gap-3 text-xs border-t border-[#1e293b]">
        <div>
          <span className="text-slate-400 text-[10px]">Rating: </span>
          <span className="font-mono font-bold text-white">{rating}</span>
        </div>
        <div>
          <span className="text-slate-400 text-[10px]">ACPL: </span>
          <span className="font-mono font-semibold text-slate-300">{acpl}</span>
        </div>
      </div>
    </div>
  )
}

export default function GameReviewCard({
  report,
  isAnalyzing,
  progress,
  onStartReview,
  mode,
  onToggleMode,
  depth,
  onChangeDepth,
  whitePlayerName = 'White',
  blackPlayerName = 'Black',
}: GameReviewCardProps) {
  const isStreamer = mode === 'streamer'

  const handleDepthChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChangeDepth(Number(e.target.value))
    },
    [onChangeDepth],
  )

  const progressBarStyle = React.useMemo(
    () => ({ width: `${progress?.percentage ?? 0}%` }),
    [progress?.percentage],
  )

  return (
    <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 shadow-lg space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242f42] pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-bold tracking-wide uppercase text-slate-200">
            Stockfish.js Game Review
          </h3>
          {report && (
            <span className="rounded-full bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              Depth {report.depth}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Depth Selector */}
          <div className="flex items-center gap-1 bg-[#111620] border border-[#242f42] rounded-lg px-2 py-1 text-xs">
            <Sliders className="h-3 w-3 text-slate-400" />
            <select
              aria-label="Analysis depth"
              value={depth}
              disabled={isAnalyzing}
              onChange={handleDepthChange}
              className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer disabled:opacity-50"
            >
              <option value={10} className="bg-[#161d2a] text-slate-200">
                Quick (Depth 10)
              </option>
              <option value={14} className="bg-[#161d2a] text-slate-200">
                Standard (Depth 14)
              </option>
              <option value={18} className="bg-[#161d2a] text-slate-200">
                Deep (Depth 18)
              </option>
            </select>
          </div>

          {/* Mode Toggle */}
          <button
            type="button"
            onClick={onToggleMode}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              isStreamer
                ? 'border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            aria-label="Switch mode"
          >
            {isStreamer ? '✨ Streamer Mode' : '♟️ Tournament Mode'}
          </button>

          {/* Start / Re-run Review */}
          <button
            type="button"
            onClick={onStartReview}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50 shadow-sm"
          >
            {report ? <RotateCcw className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            <span>{report ? 'Re-run Review' : 'Start Review'}</span>
          </button>
        </div>
      </div>

      {/* Analyzing Progress State */}
      {isAnalyzing && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              Analyzing with Stockfish.js...
            </span>
            <span className="font-mono">
              Ply {progress?.currentPly ?? 0} / {progress?.totalPlies ?? 0} ({progress?.percentage ?? 0}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-150"
              style={progressBarStyle}
            />
          </div>
        </div>
      )}

      {/* Review Metrics Content */}
      {report && (
        <div className="space-y-4">
          {/* Top Level Comparison (Accuracy & Game Rating) */}
          <div className="grid grid-cols-2 gap-3">
            <PlayerScorecard
              name={whitePlayerName}
              icon="⚪"
              accuracy={report.white.accuracy}
              rating={report.white.estimatedRating}
              acpl={report.white.acpl}
            />
            <PlayerScorecard
              name={blackPlayerName}
              icon="⚫"
              accuracy={report.black.accuracy}
              rating={report.black.estimatedRating}
              acpl={report.black.acpl}
            />
          </div>

          {/* Move Classifications Table */}
          <div className="overflow-hidden rounded-lg border border-[#242f42] bg-[#111620]">
            <div className="grid grid-cols-12 border-b border-[#242f42] bg-[#0c1017] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <div className="col-span-2 text-center">White</div>
              <div className="col-span-8 text-center">Move Classification</div>
              <div className="col-span-2 text-center">Black</div>
            </div>

            <div className="divide-y divide-[#1e293b] text-xs">
              {CLASSIFICATION_ORDER.map((key) => {
                const meta = MOVE_CLASSIFICATIONS[key]
                const label = getClassificationLabel(key, mode)
                const icon = CLASSIFICATION_ICONS[key]
                const whiteCount = report.white.classificationCounts[key] ?? 0
                const blackCount = report.black.classificationCounts[key] ?? 0

                return (
                  <div
                    key={key}
                    className="grid grid-cols-12 items-center px-3 py-1.5 hover:bg-[#161d2a] transition"
                  >
                    <div className="col-span-2 text-center font-mono font-bold text-slate-200">
                      {whiteCount}
                    </div>

                    <div className="col-span-8 flex items-center justify-center gap-1.5">
                      <span className="flex-shrink-0">{icon}</span>
                      <span className={`font-semibold ${meta.badgeText}`}>{label}</span>
                    </div>

                    <div className="col-span-2 text-center font-mono font-bold text-slate-200">
                      {blackCount}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
