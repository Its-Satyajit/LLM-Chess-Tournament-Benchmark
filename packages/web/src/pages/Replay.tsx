import { useReducer, useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { Chess } from "chess.js"
import { getGameState, getMatch, type GameState, type Match } from "../lib/api"
import ChessBoard from "../components/ChessBoard"

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"

interface ReplayState {
  gameState: GameState | null
  moves: string[]
  currentMove: number
  loading: boolean
  error: string
  matchInfo: Match | null
}

type ReplayAction =
  | { type: 'LOAD_SUCCESS'; match: Match; state: GameState }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SET_CURRENT_MOVE'; moveIndex: number | ((prev: number) => number) }

function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'LOAD_SUCCESS':
      return {
        ...state,
        matchInfo: action.match,
        gameState: action.state,
        moves: action.state.history,
        currentMove: action.state.history.length,
        loading: false,
        error: '',
      }
    case 'LOAD_ERROR':
      return {
        ...state,
        loading: false,
        error: action.error,
      }
    case 'SET_CURRENT_MOVE':
      return {
        ...state,
        currentMove:
          typeof action.moveIndex === 'function'
            ? action.moveIndex(state.currentMove)
            : action.moveIndex,
      }
    default:
      return state
  }
}

export default function Replay() {
  const { gameId, matchId } = useParams()
  const [state, dispatch] = useReducer(replayReducer, {
    gameState: null,
    moves: [],
    currentMove: 0,
    loading: true,
    error: '',
    matchInfo: null,
  })
  const { gameState, moves, currentMove, loading, error, matchInfo } = state
  const setCurrentMove = (idxOrFn: number | ((prev: number) => number)) =>
    dispatch({ type: 'SET_CURRENT_MOVE', moveIndex: idxOrFn })

  const moveList = useMemo(
    () =>
      moves.map((move, i) => ({
        id: `${gameId || 'g'}-ply-${i + 1}-${move}`,
        move,
        moveNumber: Math.floor(i / 2) + 1,
        ply: i + 1,
      })),
    [moves, gameId]
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!matchId || !gameId) {
        if (!cancelled) {
          dispatch({ type: 'LOAD_ERROR', error: "Missing matchId or gameId in URL — expected /replay/:matchId/:gameId" })
        }
        return
      }

      try {
        const [match, gameStateData] = await Promise.all([
          getMatch(matchId),
          getGameState(matchId, gameId),
        ])

        if (!cancelled) {
          dispatch({ type: 'LOAD_SUCCESS', match, state: gameStateData })
        }
      } catch {
        if (!cancelled) {
          dispatch({ type: 'LOAD_ERROR', error: "Failed to load game data. Check the match ID and try again." })
        }
      }
    }

    void load()
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

  // ← / → step through moves; Home/End jump to start/latest.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setCurrentMove((m) => Math.max(0, m - 1))
      else if (e.key === 'ArrowRight') setCurrentMove((m) => Math.min(moves.length, m + 1))
      else if (e.key === 'Home') setCurrentMove(0)
      else if (e.key === 'End') setCurrentMove(moves.length)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moves.length])
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
            <p style={{ textAlign: 'center' }}><small>Tip: use the ← → keys to step through the game.</small></p>
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
                {moveList.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.ply}`}
                    role="button"
                    className={`move-btn ${item.ply === currentMove ? 'current' : item.ply <= currentMove ? '' : 'future'}`}
                    onClick={(e) => { e.preventDefault(); setCurrentMove(item.ply) }}
                    aria-label={`Jump to move ${item.ply}: ${item.move}`}
                    aria-current={item.ply === currentMove ? "true" : undefined}
                  >
                    <small>{item.moveNumber}.</small> {item.move}
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
