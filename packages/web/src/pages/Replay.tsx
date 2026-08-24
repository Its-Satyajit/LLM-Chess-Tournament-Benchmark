import { useState, useEffect, useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { Chess } from "chess.js"
import { getGameState, getMatch, type GameState } from "../lib/api"
import type { Match } from "../lib/api"
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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading game...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400 text-lg">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          Retry
        </button>
        <Link to="/admin" className="text-blue-400 hover:text-blue-300 text-sm">
          Create a new match in Admin
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Game Replay</h2>
        {game && (
          <span className="text-sm text-gray-400">
            {`Game ${game.gameNumber} • ${game.status} • ${String(game.result) || "in progress"}`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Chess Board */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-center">
              {fen ? (
                <ChessBoard fen={fen} />
              ) : (
                <div className="aspect-square max-w-lg bg-gray-700 rounded flex items-center justify-center">
                  <span className="text-6xl">♟️</span>
                </div>
              )}
            </div>
          </div>

          {/* Move Navigation */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Navigation</h3>
              <span className="text-sm text-gray-400">
                Move {currentMove} of {moves.length}
              </span>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setCurrentMove(0)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
              >
                ⏮ Start
              </button>
              <button
                onClick={() => setCurrentMove(Math.max(0, currentMove - 1))}
                disabled={currentMove === 0}
                aria-label="Previous move"
                title={currentMove === 0 ? "Already at the start" : undefined}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
              >
                ◀ Prev
              </button>
              <button
                onClick={() => setCurrentMove(Math.min(moves.length, currentMove + 1))}
                disabled={currentMove === moves.length}
                aria-label="Next move"
                title={currentMove === moves.length ? "Already at the latest move" : undefined}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
              >
                Next ▶
              </button>
              <button
                onClick={() => setCurrentMove(moves.length)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
              >
                End ⏭
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Game Info */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-2">Game Info</h3>
            <div className="space-y-1 text-sm">
              {gameState && (
                <>
                  <p className="text-gray-400">
                    Turn: <span className="text-white capitalize">{gameState.turn}</span>
                  </p>
                  {gameState.clock.white !== undefined && (
                    <p className="text-gray-400">White Clock: <span className="text-white">{gameState.clock.white}s</span></p>
                  )}
                  {gameState.clock.black !== undefined && (
                    <p className="text-gray-400">Black Clock: <span className="text-white">{gameState.clock.black}s</span></p>
                  )}
                  {gameState.isCheck && <p className="text-red-400">Check!</p>}
                  {gameState.isCheckmate && <p className="text-red-400 font-bold">Checkmate!</p>}
                  {gameState.isStalemate && <p className="text-yellow-400">Stalemate</p>}
                  {gameState.isDraw && <p className="text-yellow-400">Draw</p>}
                </>
              )}
            </div>
          </div>

          {/* Moves List */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-bold mb-2">Moves ({moves.length})</h3>
            <div className="max-h-96 overflow-y-auto font-mono text-sm">
              {moves.length === 0 ? (
                <p className="text-gray-500">No moves yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {moves.map((move, idx) => (
                    <button
                      key={`${gameId}-move-${idx}`}
                      className={`text-left cursor-pointer px-2 py-1 rounded hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${
                        idx === currentMove - 1
                          ? "bg-blue-900 text-blue-200 font-semibold underline underline-offset-2"
                          : idx < currentMove
                            ? "text-white"
                            : "text-gray-600"
                      }`}
                      onClick={() => setCurrentMove(idx + 1)}
                      aria-label={`Jump to move ${idx + 1}: ${move}`}
                      aria-current={idx === currentMove - 1 ? "true" : undefined}
                    >
                      <span className="text-gray-500 w-8 inline-block">
                        {Math.floor(idx / 2) + 1}.
                      </span>
                      {move}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
