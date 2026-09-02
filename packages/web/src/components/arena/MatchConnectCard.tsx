import React from 'react'

export interface MatchConnectCardProps {
  matchId: string
  onMatchIdChange: (val: string) => void
  onConnect: () => void
  loading: boolean
  error: string
  hasGameState: boolean
}

export default function MatchConnectCard({
  matchId,
  onMatchIdChange,
  onConnect,
  loading,
  error,
  hasGameState,
}: MatchConnectCardProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConnect()
  }

  return (
    <article className="card">
      <header><strong>Connect to Match</strong></header>
      <p><small>Paste the match ID from Admin — press Enter or click Connect.</small></p>
      <form onSubmit={handleSubmit}>
        <label>
          Match ID
          <input
            type="text"
            placeholder="e.g., MATCH-1787585865651-702F59"
            value={matchId}
            onChange={(evt) => onMatchIdChange(evt.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button className="button" type="submit" disabled={loading} aria-busy={loading}>
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
      {error && <p role="alert"><small>{error}</small></p>}
      {matchId && !hasGameState && !loading && !error && (
        <p><small>No board yet — click Connect to load this match.</small></p>
      )}
    </article>
  )
}
