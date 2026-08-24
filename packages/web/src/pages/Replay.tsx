import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getGameState, getMatch, type GameState } from '../lib/api'
import ChessBoard from '../components/ChessBoard'

export default function Replay() {
  const { gameId, matchId } = useParams()
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [moves, setMoves] = useState<string[]>([])
  const [currentMove, setCurrentMove] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [matchInfo, setMatchInfo] = useState<{ games?: { id: string; gameNumber: number; status: string; result: unknown }[] } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!matchId || !gameId) {
        if (!cancelled) {
          setError('Missing matchId or gameId in URL')
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
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load game data')
          setLoading(false)
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [matchId, gameId])

  // Compute FEN at current move by replaying moves from initial position
  const getFenAtMove = (moveIndex: number): string => {
    if (!gameState) { return '' }

    if (moveIndex === 0) {
      // Initial position — extract from the full FEN history
      // The FEN before any moves is the initial position
      return gameState.fen.split(' ')[0] === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'
        ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        : gameState.fen
    }

    // For simplicity, we show the latest FEN when viewing any move
    // A proper implementation would replay moves from FEN using chess.js on the client
    // For now, show the final position always (the board state from API)
    return gameState.fen
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-lg">Loading game...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400 text-lg">{error}</div>
      </div>
    )
  }

  const fen = getFenAtMove(currentMove)
  const game = matchInfo?.games?.find((g) => g.id === gameId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Game Replay</h2>
        {game && (
          <span className="text-sm text-gray-400">
            Game {game.gameNumber} • {game.status} • {(game.result as string) || 'in progress'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Chess Board */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-center">
              {fen ? (
                <ChessBoard fen={fen} size={400} />
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
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                ⏮ Start
              </button>
              <button
                onClick={() => setCurrentMove(Math.max(0, currentMove - 1))}
                disabled={currentMove === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm"
              >
                ◀ Prev
              </button>
              <button
                onClick={() => setCurrentMove(Math.min(moves.length, currentMove + 1))}
                disabled={currentMove === moves.length}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 rounded text-sm"
              >
                Next ▶
              </button>
              <button
                onClick={() => setCurrentMove(moves.length)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
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
                  <p className="text-gray-400">Turn: <span className="text-white capitalize">{gameState.turn}</span></p>
                  <p className="text-gray-400">White Clock: <span className="text-white">{gameState.clock.white}s</span></p>
                  <p className="text-gray-400">Black Clock: <span className="text-white">{gameState.clock.black}s</span></p>
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
                  {moves.map((move, i) => (
                    <div
                      key={i}
                      className={`cursor-pointer px-2 py-1 rounded hover:bg-gray-700 ${
                        i === currentMove - 1 ? 'bg-blue-900 text-blue-200' : (i < currentMove ? 'text-white' : 'text-gray-600')
                      }`}
                      onClick={() => setCurrentMove(i + 1)}
                    >
                      <span className="text-gray-500 w-8 inline-block">{Math.floor(i / 2) + 1}.</span>
                      {move}
                    </div>
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
