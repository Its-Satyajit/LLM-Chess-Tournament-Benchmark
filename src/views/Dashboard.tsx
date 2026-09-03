'use client'

import { useEffect, useState, useCallback } from 'react'
import { getRatings, type Rating } from '../lib/api'

type LoadState = 'loading' | 'loaded' | 'error'

export default function Dashboard() {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [state, setState] = useState<LoadState>('loading')

  const fetchRatings = useCallback(() => {
    void getRatings()
      .then((data) => {
        setRatings(data.ratings)
        setState('loaded')
      })
      .catch(() => setState('error'))
  }, [])

  const retry = useCallback(() => {
    setState('loading')
    fetchRatings()
  }, [fetchRatings])

  useEffect(() => {
    fetchRatings()
  }, [fetchRatings])

  return (
    <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-4 sm:p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242f42] pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span>🏆 Tournament Leaderboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Elo standings across all completed matches.
          </p>
        </div>

        <button
          type="button"
          onClick={retry}
          className="rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1 text-xs font-semibold text-slate-300 transition hover:bg-[#1a2230] hover:text-white"
        >
          ↻ Refresh Standings
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#242f42] text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th scope="col" className="py-2.5 px-3">#</th>
              <th scope="col" className="py-2.5 px-3">Model</th>
              <th scope="col" className="py-2.5 px-3">Provider</th>
              <th scope="col" className="py-2.5 px-3 text-right">Rating</th>
              <th scope="col" className="py-2.5 px-3 text-right">W</th>
              <th scope="col" className="py-2.5 px-3 text-right">D</th>
              <th scope="col" className="py-2.5 px-3 text-right">L</th>
              <th scope="col" className="py-2.5 px-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#242f42]/60">
            {state === 'loading' && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500" aria-busy="true">
                  Loading leaderboard standings...
                </td>
              </tr>
            )}
            {state === 'error' && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-rose-400">
                  <p role="alert" className="mb-2">Failed to load ratings — server unreachable.</p>
                  <button
                    type="button"
                    onClick={retry}
                    className="rounded bg-rose-600/20 px-3 py-1 text-xs font-semibold text-rose-300 border border-rose-500/30"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            )}
            {state === 'loaded' && ratings.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No match ratings recorded yet. Complete a match to see rankings.
                </td>
              </tr>
            )}
            {state === 'loaded' &&
              ratings.map((r, i) => {
                const isFirst = i === 0
                const isSecond = i === 1
                const isThird = i === 2

                return (
                  <tr
                    key={`${r.provider}-${r.model}`}
                    className="transition hover:bg-[#1b2333]"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-400">
                      {isFirst ? '🥇 1' : isSecond ? '🥈 2' : isThird ? '🥉 3' : i + 1}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white" title={r.model}>
                      {r.model}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {r.provider}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                      {Math.round(r.rating)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-300" aria-label={`${r.wins} wins`}>
                      {r.wins}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-400" aria-label={`${r.draws} draws`}>
                      {r.draws}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-400" aria-label={`${r.losses} losses`}>
                      {r.losses}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white text-sm">
                      {r.points}
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
