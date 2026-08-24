import { useState, useEffect, useRef, useCallback } from 'react'
import { getMatch, getGameState, GameState } from '../lib/api'
import ChessBoard from '../components/ChessBoard'

const PROMPT_TEMPLATE = `You are participating in a competitive chess match.

Your player ID: {PLAYER_ID}
Your color: {COLOR}
Time control: {TIME_CONTROL}

Available tools:
- GET_STATE(): Retrieve the current game state
- MAKE_MOVE(move): Submit a chess move
- SEND_MESSAGE(content): Send a message to your opponent
- GET_MESSAGES(): Retrieve messages from your opponent
- DRAW_OFFER(): Offer a draw
- RESIGN(): Resign the match

Rules:
- The server is authoritative
- Do not assume the current board state
- Retrieve the current state before making a move
- Only make a move when it is your turn
- You may call GET_STATE multiple times per turn
- Each tool call consumes time from your clock
- Illegal moves are rejected; you can retry within your time

Gameplay:
- Play standard chess rules
- You can send messages to your opponent at any time
- Messages do not affect the game state
- You may bluff or mislead in messages
- Draw offers require opponent acceptance
- Resignation is immediate and irreversible`

interface WsEvent {
  type: string
  matchId: string
  gameId?: string
  move?: string
  player?: string
  sender?: string
  content?: string
  result?: string
  reason?: string
  fen?: string
  turn?: string
  clock?: { white: number; black: number }
  from?: string
  accepted?: boolean
}

export default function Arena() {
  const [matchId, setMatchId] = useState('')
  const [gameId, setGameId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [timeControl] = useState('10+5')
  const [status, setStatus] = useState('No match selected')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [moves, setMoves] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [wsEvents, setWsEvents] = useState<WsEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const fetchGameState = useCallback(async (mId: string, gId: string) => {
    try {
      const state = await getGameState(mId, gId)
      setGameState(state)
      setMoves(state.history)
    } catch {
      setError('Failed to fetch game state')
    }
  }, [])

  const connectWebSocket = useCallback((mId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//localhost:3001/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      ws.send(JSON.stringify({ type: 'subscribe', matchId: mId }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsEvent
        setWsEvents(prev => [...prev.slice(-50), data]) // Keep last 50 events

        switch (data.type) {
          case 'state_update':
            if (data.gameId === gameId) {
              setGameState(prev => prev ? { ...prev, fen: data.fen || prev.fen, turn: (data.turn as 'white' | 'black') || prev.turn, clock: data.clock || prev.clock } : prev)
            }
            break
          case 'move_made':
            if (data.gameId === gameId) {
              setMoves(prev => [...prev, data.move || ''])
              setGameState(prev => prev ? { ...prev, turn: (data.player === gameState?.fen?.split(' ')[1] ? (data.player === 'w' ? 'black' : 'white') : 'white') as 'white' | 'black', clock: data.clock || prev.clock } : prev)
              // Re-fetch full state after a move
              fetchGameState(mId, data.gameId!)
            }
            break
          case 'message_sent':
            // Could show notification
            break
          case 'game_over':
            setStatus(`Game Over: ${data.result} (${data.reason})`)
            break
          case 'match_over':
            setStatus(`Match Over: ${data.result}`)
            break
        }
      } catch {
        // Ignore parse errors
      }
    }

    ws.onclose = () => {
      setWsConnected(false)
    }

    ws.onerror = () => {
      setWsConnected(false)
    }
  }, [gameId, gameState, fetchGameState])

  const connectToMatch = async () => {
    if (!matchId.trim()) {
      setError('Enter a match ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const match = await getMatch(matchId)
      if (match.error) {
        setError(match.error as string)
        setLoading(false)
        return
      }

      setStatus(match.status)

      // Get the current active game
      const activeGame = match.games.find(g => g.status === 'active') || match.games[0]
      if (activeGame) {
        setGameId(activeGame.id)
        setPlayerId(match.playerAId || '')
        setPlayerColor(activeGame.whitePlayerId === match.playerAId ? 'white' : 'black')
        await fetchGameState(matchId, activeGame.id)

        // Connect WebSocket
        connectWebSocket(matchId)
      }
    } catch {
      setError('Failed to connect to match')
    }

    setLoading(false)
  }

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  const getPrompt = () =>
      PROMPT_TEMPLATE
        .replace('{PLAYER_ID}', playerId)
        .replace('{COLOR}', playerColor)
        .replace('{TIME_CONTROL}', timeControl)

  const copyPrompt = () => {
    navigator.clipboard.writeText(getPrompt())
    alert('Prompt copied to clipboard!')
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        {/* Chess Board */}
        <div className="bg-gray-800 rounded-lg p-4">
          {gameState ? (
            <div className="flex justify-center">
              <ChessBoard fen={gameState.fen} size={400} />
            </div>
          ) : (
            <div className="aspect-square max-w-lg mx-auto bg-gray-700 rounded flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">♟️</div>
                <p className="text-lg">Enter a Match ID to connect</p>
                <p className="text-sm mt-2">or create a match in Admin</p>
              </div>
            </div>
          )}
        </div>

        {/* Prompt for LLM */}
        {gameState && playerId && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold">LLM Prompt</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                >
                  {showPrompt ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={copyPrompt}
                  className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                >
                  Copy
                </button>
              </div>
            </div>
            {showPrompt && (
              <pre className="bg-gray-900 p-4 rounded text-sm overflow-auto max-h-64 font-mono whitespace-pre-wrap">
                {getPrompt()}
              </pre>
            )}
            {!showPrompt && (
              <p className="text-gray-400 text-sm">
                Click "Show" to see the prompt for your LLM, or "Copy" to copy it directly.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Game Info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">Game Info</h2>
            <span className={`text-xs px-2 py-1 rounded ${wsConnected ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
              {wsConnected ? '🟢 Live' : '🔴 Polling'}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-gray-400">Status: <span className="text-white">{status}</span></p>
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

        {/* Legal Moves */}
        {gameState?.legalMoves && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-2">Legal Moves ({gameState.legalMoves.length})</h2>
            <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
              {gameState.legalMoves.map((move, i) => (
                <span key={i} className="bg-gray-700 px-2 py-1 rounded text-xs">{move}</span>
              ))}
            </div>
          </div>
        )}

        {/* Moves */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-2">Moves ({moves.length})</h2>
          <div className="max-h-64 overflow-y-auto font-mono text-sm">
            {moves.length === 0 ? (
              <p className="text-gray-500">No moves yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-1">
                {moves.map((move, i) => (
                  <div key={i} className="flex">
                    <span className="text-gray-500 w-8">{Math.floor(i / 2) + 1}.</span>
                    <span>{move}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* WebSocket Events */}
        {wsEvents.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-2">Live Events ({wsEvents.length})</h2>
            <div className="max-h-32 overflow-y-auto text-xs font-mono">
              {wsEvents.slice(-10).map((ev, idx) => (
                <div key={`${ev.type}-${idx}-${ev.move || ''}`} className="text-gray-400 border-b border-gray-700 py-1">
                  <span className="text-blue-400">{ev.type}</span>
                  {ev.move && <span className="text-green-400 ml-2">{ev.move}</span>}
                  {ev.content && <span className="text-yellow-400 ml-2">"{ev.content}"</span>}
                  {ev.result && <span className="text-red-400 ml-2">{ev.result}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connect */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-lg font-bold mb-2">Connect to Match</h2>
          <input
            type="text"
            placeholder="Match ID (e.g., MATCH-1787585865651-702F59)"
            value={matchId}
            onChange={(evt) => setMatchId(evt.target.value)}
            className="w-full bg-gray-700 rounded px-3 py-2 text-sm mb-2"
          />
          <button
            onClick={connectToMatch}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded px-3 py-2"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    </div>
  )
}
