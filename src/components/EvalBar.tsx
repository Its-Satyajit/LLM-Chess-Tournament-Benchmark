'use client'

import React from 'react'
import { calculateWinProbability } from '../lib/gameReview/metrics'

export interface EvalBarProps {
  centipawns: number
  isMate?: boolean
  mateIn?: number
  heightClass?: string
}

export default function EvalBar({
  centipawns,
  isMate = false,
  mateIn,
  heightClass = 'h-full min-h-[340px]',
}: EvalBarProps) {
  let scoreText: string
  if (isMate && mateIn !== undefined) {
    scoreText = `M${Math.abs(mateIn)}`
  } else {
    const pawns = centipawns / 100
    if (Math.abs(pawns) < 0.05) {
      scoreText = '0.0'
    } else {
      scoreText = (pawns > 0 ? '+' : '') + pawns.toFixed(1)
    }
  }

  // Calculate percentage of White bar using win probability curve clamped to [5, 95]
  const winProb = calculateWinProbability(centipawns)
  const whiteHeightPercent = Math.max(5, Math.min(95, Math.round(winProb)))
  const whiteStyle = React.useMemo(() => ({ height: `${whiteHeightPercent}%` }), [whiteHeightPercent])

  return (
    <div
      className={`relative w-7 flex flex-col justify-end overflow-hidden rounded-md border border-[#2e3c54] bg-[#111620] shadow-md select-none ${heightClass}`}
      title={`Evaluation: ${scoreText}`}
      aria-label={`Evaluation: ${scoreText}`}
    >
      {/* Black's section (top/dark) */}
      <div className="absolute inset-0 bg-[#1e293b]" />

      {/* White's section (bottom/light) */}
      <div
        className="absolute bottom-0 w-full bg-slate-100 transition-all duration-300 ease-out"
        style={whiteStyle}
      />

      {/* Centipawn text overlay */}
      <div
        className={`relative z-10 w-full py-1 text-center font-mono text-[10px] font-black tracking-tighter ${
          whiteHeightPercent > 50 ? 'text-slate-900' : 'text-slate-100'
        }`}
      >
        {scoreText}
      </div>
    </div>
  )
}
