import { useEffect, useState } from 'react'
import type { Rating } from '../lib/api';
import { getRatings } from '../lib/api'

type LoadState = 'loading' | 'loaded' | 'error'

export default function Dashboard() {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [state, setState] = useState<LoadState>('loading')

  const load = () => {
    setState('loading')
    getRatings()
      .then(data => {
        setRatings(data.ratings)
        setState('loaded')
      })
      .catch(() => setState('error'))
  }

  useEffect(load, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Leaderboard</h2>
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Model</th>
              <th className="px-4 py-3 text-left">Provider</th>
              <th className="px-4 py-3 text-right">Rating</th>
              <th className="px-4 py-3 text-right">W</th>
              <th className="px-4 py-3 text-right">D</th>
              <th className="px-4 py-3 text-right">L</th>
              <th className="px-4 py-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {state === 'loading' && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  Loading ratings...
                </td>
              </tr>
            )}
            {state === 'error' && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <p className="text-red-400 mb-2">Failed to load ratings — the server may be unreachable.</p>
                  <button
                    onClick={load}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            )}
            {state === 'loaded' && (ratings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No ratings yet. Run some matches first.
                </td>
              </tr>
            ) : (
              ratings.map((r, i) => (
                <tr key={i} className="border-t border-gray-700">
                  <td className="px-4 py-3">{i + 1}</td>
                  <td className="px-4 py-3 font-medium max-w-[16rem] truncate" title={r.model}>{r.model}</td>
                  <td className="px-4 py-3 text-gray-400">{r.provider}</td>
                  <td className="px-4 py-3 text-right font-mono">{Math.round(r.rating)}</td>
                  <td className="px-4 py-3 text-right text-green-400" aria-label={`${r.wins} wins`}>{r.wins}</td>
                  <td className="px-4 py-3 text-right text-yellow-400" aria-label={`${r.draws} draws`}>{r.draws}</td>
                  <td className="px-4 py-3 text-right text-red-400" aria-label={`${r.losses} losses`}>{r.losses}</td>
                  <td className="px-4 py-3 text-right font-bold">{r.points}</td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
