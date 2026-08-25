import { useState, useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { Chess } from "chess.js"
import { getGameState, getMatch, type GameState, type Match } from "../lib/api"
import ChessBoard from "../components/ChessBoard"

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

export default function Replay() {
  const { gameId, matchId } = useParams()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [moves, setMoves] = useState<string[]>([])
  const [currentMove, setCurrentMove] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [matchInfo, setMatchInfo] = useState<Match | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!matchId || !gameId) {
        if (!cancelled) {
          setError("Missing matchId or gameId in URL — expected /replay/:matchId/:gameId")
          setLoading(false)
        }
        return
      }

      try {
        const [match, state] = await Promise.all([
          getMatch(matchId),
          getGameState(matchId, gameId),
        ])

        if (!cancelled) {
          setMatchInfo(match)
          setGameState(state)
          setMoves(state.history)
          setCurrentMove(state.history.length)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load game data. Check the match ID and try again.")
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [matchId, gameId])

  // Build FEN history by replaying moves from initial position
  const fenHistory = useMemo(() => {
    if (moves.length === 0) return [START_FEN]

    const chess = new Chess()
    const fens: string[] = [chess.fen()]

    for (const move of moves) {
      try {
        chess.move(move)
        fens.push(chess.fen())
      } catch {
        // Illegal move in history — stop replaying
        break
      }
    }

    return fens
  }, [moves])

  const fen = fenHistory[currentMove] ?? fenHistory[fenHistory.length - 1] ?? ""
  const game = matchInfo?.games?.find((g) => g.id === gameId)

  if (loading) {
    return <p aria-busy="true">Loading game...</p>
  }

  if (error) {
    return (
      <article className="card">
        <p role="alert">{error}</p>
        <button className="button" onClick={() => window.location.reload()}>Retry</button>{' '}
        <Link to="/admin">
          <button className="button" data-variant="outline">Create a new match</button>
        </Link>
      </article>
    )
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Game Replay</h2>
        {game && (
          <small>
            {`Game ${game.gameNumber} • ${game.status} • ${String(game.result) || "in progress"}`}
          </small>
        )}
      </div>

      <div className="grid">
        <div>
          {/* Chess Board */}
          {fen ? <ChessBoard fen={fen} /> : <div className="board-empty"><span>♟️</span></div>}

          {/* Move Navigation */}
          <article className="card">
            <header>
              <strong>Navigation</strong>{' '}
              <small style={{ float: 'right' }}>Move {currentMove} of {moves.length}</small>
            </header>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="button" onClick={() => setCurrentMove(0)} data-variant="outline">⏮ Start</button>
              <button
                className="button"
                onClick={() => setCurrentMove(Math.max(0, currentMove - 1))}
                disabled={currentMove === 0}
                aria-label="Previous move"
                title={currentMove === 0 ? "Already at the start" : undefined}
                data-variant="outline"
              >
                ◀ Prev
              </button>
              <button
                className="button"
                onClick={() => setCurrentMove(Math.min(moves.length, currentMove + 1))}
                disabled={currentMove === moves.length}
                aria-label="Next move"
                title={currentMove === moves.length ? "Already at the latest move" : undefined}
                data-variant="outline"
              >
                Next ▶
              </button>
              <button className="button" onClick={() => setCurrentMove(moves.length)} data-variant="outline">End ⏭</button>
            </div>
          </article>
        </div>

        <aside>
          {/* Game Info */}
          <article className="card">
            <h3>Game Info</h3>
            {gameState && (
              <>
                <p><small>Turn: <span style={{ textTransform: 'capitalize' }}>{gameState.turn}</span></small></p>
                {gameState.clock.white !== undefined && (
                  <p><small>White Clock: {gameState.clock.white}s</small></p>
                )}
                {gameState.clock.black !== undefined && (
                  <p><small>Black Clock: {gameState.clock.black}s</small></p>
                )}
                {gameState.isCheck && <p><mark>Check!</mark></p>}
                {gameState.isCheckmate && <p><strong>⚑ Checkmate!</strong></p>}
                {gameState.isStalemate && <p><mark>Stalemate</mark></p>}
                {gameState.isDraw && <p><mark>Draw</mark></p>}
              </>
            )}
          </article>

          {/* Moves List */}
          <article className="card">
            <h3>Moves ({moves.length})</h3>
            {moves.length === 0 ? (
              <p><small>No moves yet</small></p>
            ) : (
              <nav className="moves-grid" aria-label="Jump to move">
                {moves.map((move, idx) => (
                  <a
                    key={`${gameId}-move-${idx}`}
                    href={`#${idx + 1}`}
                    role="button"
                    className={`move-btn ${idx === currentMove - 1 ? 'current' : idx < currentMove ? '' : 'future'}`}
                    onClick={(e) => { e.preventDefault(); setCurrentMove(idx + 1) }}
                    aria-label={`Jump to move ${idx + 1}: ${move}`}
                    aria-current={idx === currentMove - 1 ? "true" : undefined}
                  >
                    <small>{Math.floor(idx / 2) + 1}.</small> {move}
                  </a>
                ))}
              </nav>
            )}
          </article>
        </aside>
      </div>
    </>
  )
}
