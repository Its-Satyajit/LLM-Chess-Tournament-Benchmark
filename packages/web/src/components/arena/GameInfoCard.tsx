import { Link } from 'react-router-dom'
import type { Match, GameState } from '../../lib/api'

export interface GameInfoCardProps {
  wsConnected: boolean
  status: string
  gameState: GameState | null
  matchInfo: Match | null
  matchId: string
  activeGameId: string
  onSelectGame: (gameId: string) => void
}

function ClockDisplay({ seconds, label }: { seconds: number | undefined; label: string }) {
  if (seconds === undefined) return null
  const low = seconds <= 30
  return (
    <p>
      <small>
        {label}:{' '}
        <span className={low ? 'clock clock-low' : 'clock'}>
          {seconds}s{low ? ' — LOW TIME' : ''}
        </span>
      </small>
    </p>
  )
}

export default function GameInfoCard({
  wsConnected,
  status,
  gameState,
  matchInfo,
  matchId,
  activeGameId,
  onSelectGame,
}: GameInfoCardProps) {
  return (
    <article className="card">
      <header>
        <strong>Game Info</strong>{' '}
        <span
          className="badge live-badge"
          data-live={wsConnected}
          data-variant={wsConnected ? 'success' : 'danger'}
          role="status"
        >
          {wsConnected ? 'Live' : 'Reconnecting'}
        </span>
      </header>

      {!wsConnected && gameState && (
        <p><small>Reconnecting automatically every 3s...</small></p>
      )}

      <p>Status: {status}</p>

      {gameState && (
        <>
          <p>Turn: <span style={{ textTransform: 'capitalize' }}>{gameState.turn}</span></p>
          <ClockDisplay seconds={gameState.clock.white} label="White Clock" />
          <ClockDisplay seconds={gameState.clock.black} label="Black Clock" />
          {gameState.isCheck && <p><span className="badge" data-variant="warning">⚠ Check</span></p>}
          {gameState.isCheckmate && <p><mark>⚑ Checkmate!</mark></p>}
          {gameState.isStalemate && <p><mark>Stalemate</mark></p>}
          {gameState.isDraw && <p><mark>Draw</mark></p>}
        </>
      )}

      {matchInfo && matchInfo.games.length > 0 && (
        <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--card-border-color, #333)', paddingTop: '0.5rem' }}>
          <p style={{ margin: '0 0 0.25rem 0' }}><small><strong>Match Games:</strong></small></p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {matchInfo.games.map((g) => {
              const isSelected = g.id === activeGameId
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelectGame(g.id)}
                  className="button"
                  data-variant={isSelected ? 'primary' : 'outline'}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                >
                  Game {g.gameNumber} ({g.status})
                </button>
              )
            })}
          </div>

          <p style={{ margin: '0 0 0.25rem 0' }}><small><strong>Replays:</strong></small></p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {matchInfo.games.map((g) => (
              <Link
                key={g.id}
                to={`/replay/${matchId}/${g.id}`}
                className="button"
                data-variant="outline"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
              >
                Replay Game {g.gameNumber}
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
