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
  clock?: { white?: number; black?: number }
  from?: string
  accepted?: boolean
}

const WS_RECONNECT_MS = 3000

export default function Arena() {
  const [matchId, setMatchId] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white')
  const [timeControl] = useState('10+5')
  const [status, setStatus] = useState('No match selected')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [moves, setMoves] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [wsConnected, setWsConnected] = useState(false)
  const [wsEvents, setWsEvents] = useState<WsEvent[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeMatchRef = useRef('')
  const gameIdRef = useRef('')

  const fetchGameState = useCallback(async (mId: string, gId: string) => {
    try {
      const state = await getGameState(mId, gId)
      setGameState(state)
      setMoves(state.history)
    } catch {
      setError('Failed to fetch game state')
    }
  }, [])

  // Stable WS handler — uses refs to avoid reconnection loops
  const handleWsMessage = useCallback((event: MessageEvent, mId: string) => {
    try {
      // SAFETY: WS messages are JSON from our own server
      const data = JSON.parse(event.data) as WsEvent
      setWsEvents(prev => [...prev.slice(-50), data])

      switch (data.type) {
        case 'subscribed':
          break
        case 'move_made':
          if (data.gameId === gameIdRef.current) {
            fetchGameState(mId, data.gameId)
          }
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
  }, [fetchGameState])

  const connectWebSocket = useCallback((mId: string) => {
    if (wsRef.current) {
      wsRef.current.close()
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:3001/ws`)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      ws.send(JSON.stringify({ type: 'subscribe', matchId: mId }))
    }

    ws.onmessage = (event) => handleWsMessage(event, mId)

    ws.onclose = () => {
      setWsConnected(false)
      // Auto-reconnect while a match is active
      if (activeMatchRef.current === mId && !reconnectTimerRef.current) {
        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null
          connectWebSocket(mId)
        }, WS_RECONNECT_MS)
      }
    }
    ws.onerror = () => setWsConnected(false)
  }, [handleWsMessage])

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
        setError(`${String(match.error)} — double-check the match ID`)
        setLoading(false)
        return
      }

      setStatus(match.status)

      const activeGame = match.games.find(g => g.status === 'active') || match.games[0]
      if (activeGame) {
        activeMatchRef.current = matchId
        gameIdRef.current = activeGame.id
        setPlayerId(match.playerAId || '')
        setPlayerColor(activeGame.whitePlayerId === match.playerAId ? 'white' : 'black')
        await fetchGameState(matchId, activeGame.id)
        connectWebSocket(matchId)
      }
    } catch {
      setError('Failed to connect to match — is the server running? Check the ID and retry.')
    }

    setLoading(false)
  }

  useEffect(() => () => {
    activeMatchRef.current = ''
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }
    wsRef.current?.close()
  }, [])

  useEffect(() => {
    if (copyState === 'idle') return
    const t = setTimeout(() => setCopyState('idle'), 2000)
    return () => clearTimeout(t)
  }, [copyState])

  const getPrompt = () =>
    PROMPT_TEMPLATE
      .replace('{PLAYER_ID}', playerId)
      .replace('{COLOR}', playerColor)
      .replace('{TIME_CONTROL}', timeControl)

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(getPrompt())
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  const formatClock = (seconds: number | undefined, label: string) => {
    if (seconds === undefined) return null
    const low = seconds <= 30
    return (
      <p>
        <small>{label}:{' '}
          <span className={low ? 'clock-low' : undefined}>
            {seconds}s{low ? ' — LOW TIME' : ''}
          </span>
        </small>
      </p>
    )
  }

  return (
    <div className="grid">
      <div>
        {/* Chess Board */}
        {gameState ? (
          <ChessBoard fen={gameState.fen} />
        ) : (
          <div className="board-empty">
            <div>
              <p style={{ fontSize: '3rem', margin: 0 }}>♟️</p>
              <p>Enter a Match ID to connect</p>
              <p><small>or create a match in Admin</small></p>
            </div>
          </div>
        )}

        {/* Prompt for LLM */}
        {gameState && playerId && (
          <article className="card">
            <header>
              <strong>LLM Prompt</strong>
              <button className="button" data-variant="secondary" onClick={() => setShowPrompt(!showPrompt)} aria-expanded={showPrompt} style={{ float: 'right' }}>
                {showPrompt ? 'Hide' : 'Show'}
              </button>
              <button className="button" onClick={copyPrompt} aria-live="polite" style={{ float: 'right' }}>
                Copy
              </button>
            </header>
            {copyState !== 'idle' && (
              <p role="status">
                <span className="badge" data-variant={copyState === 'copied' ? 'success' : 'danger'}>
                  {copyState === 'copied'
                    ? 'Prompt copied to clipboard.'
                    : 'Copy failed — clipboard unavailable. Use "Show" and select manually.'}
                </span>
              </p>
            )}
            {showPrompt && (
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '16rem', overflow: 'auto' }}>
                {getPrompt()}
              </pre>
            )}
            {!showPrompt && (
              <p><small>Click "Show" to see the prompt for your LLM, or "Copy" to copy it directly.</small></p>
            )}
          </article>
        )}
      </div>

      <aside>
        {/* Game Info */}
        <article className="card">
          <header>
            <strong>Game Info</strong>{' '}
            <span className="badge" data-variant={wsConnected ? "success" : "danger"} role="status">
              {wsConnected ? '● Live' : '○ Disconnected'}
            </span>
          </header>
          {!wsConnected && gameState && (
            <p><small>Reconnecting automatically every {WS_RECONNECT_MS / 1000}s...</small></p>
          )}
          <p>Status: {status}</p>
          {gameState && (
            <>
              <p>Turn: <span style={{ textTransform: 'capitalize' }}>{gameState.turn}</span></p>
              {formatClock(gameState.clock.white, 'White Clock')}
              {formatClock(gameState.clock.black, 'Black Clock')}
              {gameState.isCheck && <p><span className="badge" data-variant="warning">⚠ Check</span></p>}
              {gameState.isCheckmate && <p><mark>⚑ Checkmate!</mark></p>}
              {gameState.isStalemate && <p><mark>Stalemate</mark></p>}
              {gameState.isDraw && <p><mark>Draw</mark></p>}
            </>
          )}
        </article>

        {/* Legal Moves */}
        {gameState?.legalMoves && (
          <article className="card">
            <header><strong>Legal Moves ({gameState.legalMoves.length})</strong></header>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '8rem', overflowY: 'auto' }}>
              {gameState.legalMoves.map((move, i) => (
                <code key={i}>{move}</code>
              ))}
            </div>
          </article>
        )}

        {/* Moves */}
        <article className="card">
          <header><strong>Moves ({moves.length})</strong></header>
          {moves.length === 0 ? (
            <p><small>No moves yet</small></p>
          ) : (
            <div className="scroll-y" style={{ maxHeight: '16rem' }}>
              {moves.map((move, i) => (
                <div key={i}>
                  <small>{Math.floor(i / 2) + 1}.</small> {move}
                </div>
              ))}
            </div>
          )}
        </article>

        {/* WebSocket Events */}
        {wsEvents.length > 0 && (
          <article className="card">
            <header><strong>Live Events ({wsEvents.length})</strong></header>
            <div className="scroll-y" style={{ maxHeight: '8rem' }}>
              {wsEvents.slice(-10).map((ev, idx) => (
                <div key={`${ev.type}-${idx}-${ev.move || ''}`}>
                  <code>{ev.type}</code>
                  {ev.move && <code>{ev.move}</code>}
                  {ev.content && <em>"{ev.content}"</em>}
                  {ev.result && <del>{ev.result}</del>}
                </div>
              ))}
            </div>
          </article>
        )}

        {/* Connect */}
        <article className="card">
          <header><strong>Connect to Match</strong></header>
          <label>
            Match ID
            <input
              type="text"
              placeholder="e.g., MATCH-1787585865651-702F59"
              value={matchId}
              onChange={(evt) => setMatchId(evt.target.value)}
            />
          </label>
          <button className="button" onClick={connectToMatch} disabled={loading} aria-busy={loading}>
            {loading ? 'Connecting...' : 'Connect'}
          </button>
          {error && <p role="alert"><small>{error}</small></p>}
        </article>
      </aside>
    </div>
  )
}
