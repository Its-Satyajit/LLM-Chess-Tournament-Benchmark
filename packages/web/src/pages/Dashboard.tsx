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
    <article className="card leaderboard">
      <h2>Leaderboard</h2>
      <p><small>Standings across all finished matches — Elo rating with win/draw/loss record.</small></p>
      <table data-striped>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Model</th>
            <th scope="col">Provider</th>
            <th scope="col" style={{ textAlign: 'right' }}>Rating</th>
            <th scope="col" style={{ textAlign: 'right' }}>W</th>
            <th scope="col" style={{ textAlign: 'right' }}>D</th>
            <th scope="col" style={{ textAlign: 'right' }}>L</th>
            <th scope="col" style={{ textAlign: 'right' }}>Points</th>
          </tr>
        </thead>
        <tbody>
          {state === 'loading' && (
            <tr>
              <td colSpan={8} aria-busy="true">Loading ratings...</td>
            </tr>
          )}
          {state === 'error' && (
            <tr>
              <td colSpan={8}>
                <p role="alert">Failed to load ratings — the server may be unreachable.</p>
                <button onClick={load}>Retry</button>
              </td>
            </tr>
          )}
          {state === 'loaded' && (ratings.length === 0 ? (
            <tr>
              <td colSpan={8}><small>No ratings yet. Run some matches first.</small></td>
            </tr>
          ) : (
            ratings.map((r, i) => (
              <tr key={i}>
                <td className="rank">{i + 1}</td>
                <td title={r.model}>{r.model}</td>
                <td><small>{r.provider}</small></td>
                <td className="rating" style={{ textAlign: 'right' }}>{Math.round(r.rating)}</td>
                <td style={{ textAlign: 'right' }} aria-label={`${r.wins} wins`}>{r.wins}</td>
                <td style={{ textAlign: 'right' }} aria-label={`${r.draws} draws`}>{r.draws}</td>
                <td style={{ textAlign: 'right' }} aria-label={`${r.losses} losses`}>{r.losses}</td>
                <td style={{ textAlign: 'right' }}><strong>{r.points}</strong></td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </article>
  )
}
