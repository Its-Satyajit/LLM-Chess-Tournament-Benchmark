'use client'

import React from 'react'
import type { PlyReview } from '../lib/gameReview/coordinator'
import { MOVE_CLASSIFICATIONS } from '../lib/gameReview/metrics'

export interface AdvantageGraphProps {
  plies: PlyReview[]
  currentPly: number
  onSelectPly: (ply: number) => void
  height?: number
}

export default function AdvantageGraph({
  plies,
  currentPly,
  onSelectPly,
  height = 80,
}: AdvantageGraphProps) {
  if (plies.length === 0) return null

  const width = 600
  const maxCp = 600 // Clamp graph scale between -6.0 and +6.0 pawns
  const midY = height / 2

  // Transform centipawns to Y coordinate (White advantage is above midline, Black is below)
  const getY = (cp: number) => {
    const clamped = Math.max(-maxCp, Math.min(maxCp, cp))
    // clamped > 0 -> y < midY (higher up in SVG)
    return midY - (clamped / maxCp) * (midY - 8)
  }

  const stepX = width / Math.max(1, plies.length - 1)

  const points = plies.map((ply, i) => {
    const x = Math.round(i * stepX * 10) / 10
    const y = Math.round(getY(ply.centipawns) * 10) / 10
    return { ...ply, x, y }
  })

  // Build SVG path
  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`
    return `${acc} L ${pt.x} ${pt.y}`
  }, '')

  // Build area fill path
  const areaD = `${pathD} L ${points[points.length - 1]?.x ?? width} ${midY} L 0 ${midY} Z`

  const handleSvgClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (e.target instanceof Element) {
        const plyAttr = e.target.getAttribute('data-ply')
        if (plyAttr) {
          onSelectPly(Number(plyAttr))
        }
      }
    },
    [onSelectPly],
  )

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowLeft') onSelectPly(Math.max(1, currentPly - 1))
      else if (e.key === 'ArrowRight') onSelectPly(Math.min(plies.length, currentPly + 1))
    },
    [onSelectPly, currentPly, plies.length],
  )

  return (
    <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3 space-y-1.5 shadow-md">
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
        <span>Advantage Evaluation Timeline</span>
        <span className="font-mono text-emerald-400">Click any point to jump</span>
      </div>

      <button
        type="button"
        className="relative w-full overflow-hidden text-left p-0 border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded"
        aria-label="Advantage evaluation timeline"
        onClick={handleSvgClick}
        onKeyDown={handleKeyDown}
      >
        <svg
          data-testid="advantage-graph-svg"
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-20 overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {/* Neutral Baseline (0.0 eval) */}
          <line
            x1="0"
            y1={midY}
            x2={width}
            y2={midY}
            stroke="#334155"
            strokeDasharray="3,3"
            strokeWidth="1"
          />

          {/* Shaded advantage area */}
          <path d={areaD} fill="rgba(16, 185, 129, 0.15)" />

          {/* Advantage line */}
          <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />

          {/* Active ply vertical line */}
          {currentPly > 0 && currentPly <= plies.length && (
            <line
              x1={(currentPly - 1) * stepX}
              y1="0"
              x2={(currentPly - 1) * stepX}
              y2={height}
              stroke="#38bdf8"
              strokeWidth="1.5"
            />
          )}

          {/* Interactive clickable nodes */}
          {points.map((pt) => {
            const isCurrent = pt.ply === currentPly
            const meta = MOVE_CLASSIFICATIONS[pt.classification]

            return (
              <circle
                key={pt.ply}
                data-testid={`ply-point-${pt.ply}`}
                data-ply={pt.ply}
                cx={pt.x}
                cy={pt.y}
                r={isCurrent ? 5 : 3}
                fill={meta ? meta.color : '#94a3b8'}
                stroke={isCurrent ? '#ffffff' : '#0f172a'}
                strokeWidth={isCurrent ? 2 : 1}
                className="hover:r-6 transition-all"
              >
                <title>{`Ply ${pt.ply} (${pt.playedMove}): ${(pt.centipawns / 100).toFixed(1)} [${pt.classification}]`}</title>
              </circle>
            )
          })}
        </svg>
      </button>
    </div>
  )
}
