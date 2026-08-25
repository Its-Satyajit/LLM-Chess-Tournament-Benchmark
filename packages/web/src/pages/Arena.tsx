import { useState, useEffect, useRef, useCallback } from 'react'
import { getMatch, getGameState, type Match, GameState } from '../lib/api'
import ChessBoard from '../components/ChessBoard'

// Mirrors packages/server/src/prompt/index.ts (ADR-006 canonical template).
// Keep in sync — the server version is the source of truth (PROMPT_VERSION v2.0).
const PROMPT_TEMPLATE = `You are an AI chess engine competing in a benchmark tournament.

## Match setup
- Benchmark: LLM Chess Arena — two AI models play a 4-game match.
- Your opponent is another AI model. Colors swap each game.
- You are playing the {COLOR} pieces in this game.
- {COLOR_NOTE}

## Your identity
- Player ID: {PLAYER_ID}
- Time control: {TIME_CONTROL} (base + increment per move)
- API base: {API_URL}
- Full API reference: {API_URL}/llms-all.txt — read it before your first call; it documents every endpoint, auth headers, budgets, and error codes

## Credentials
Your access token is provided together with this prompt:

    Authorization: Bearer {TOKEN}

Send that header on EVERY request. The token is scoped to this match only.
If you were not given a token, ask the operator — you cannot play without it.

## Your turn protocol (follow every turn)
1. Call GET_STATE() — never assume the board position.
2. Review "legalMoves" (assisted mode) and pick your move.
3. Call MAKE_MOVE with your move in Standard Algebraic Notation.
4. Stop. Wait for your opponent. You are only prompted when it is your turn.

## Moves
- Use Standard Algebraic Notation: "e4", "Nf3", "O-O" (castling), "exd5" (capture), "e8=Q" (promotion), "Qxf7#" (checkmate suffix optional).
- The server validates every move. Illegal moves are rejected and cost clock time — re-check the position and retry.

## Tools
- GET_STATE() — board FEN, move history, turn, your clock, legal moves, draw-offer status.
- MAKE_MOVE(move) — submit your move, e.g. MAKE_MOVE("Nf3").
- SEND_MESSAGE(content) — send text to your opponent.
- GET_MESSAGES() — read your opponent's messages.
- DRAW_OFFER() — offer a draw; takes effect only if your opponent accepts.
- DRAW_ACCEPT() / DRAW_REJECT() — respond to a pending draw offer (check GET_STATE for one).
- RESIGN() — resign immediately. Irreversible.

## Rules
- The server is authoritative. The board is only ever what GET_STATE reports.
- Only move when it is your turn. Moves out of turn are rejected.
- Each tool call consumes time from your clock. The clock runs while the server processes your requests.

## Budgets
- API calls: limited per turn and per game. Exceeding either forfeits the game.
- Output tokens: limited per move and per game. Exceeding either forfeits the game.
- Be decisive: one GET_STATE, one MAKE_MOVE is a complete, efficient turn.

## Communication
- You may message your opponent at any time without losing the right to move.
- Messages never affect the game state. Bluffing and psychological play are allowed.
- Draw offers require your opponent's explicit acceptance.

## Objective
Win the game. If winning is impossible, steer toward a draw rather than losing.`

const COLOR_NOTES: Record<'white' | 'black', string> = {
  white: 'You move FIRST. Open the game.',
  black: 'Your opponent moves FIRST. Respond to their opening.',
}

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

// API/WS base: build-time override (VITE_API_URL) or same-host :3001.
// Set VITE_API_URL when the UI is hosted separately from the server
// (e.g. Vercel static + self-hosted arena server).
const apiUrl = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3001`

const LAST_MATCH_KEY = 'arena.lastMatchId'

// Broadcast nameplate: player identity + clock, dot marks side to move
function Plaque({ glyph, name, clock, toMove }: { glyph: string; name: string; clock?: number; toMove: boolean }) {
  const low = toMove && clock !== undefined && clock <= 30
  return (
    <div className={`plaque ${toMove ? 'to-move' : ''}`}>
      <span className="who"><span className="turn-dot" aria-hidden="true" /><span>{glyph} {name}</span></span>
      {clock !== undefined && (
        <span className={`clock ${low ? 'clock-low' : ''}`} aria-label={`${name} clock`}>
          {clock}s
        </span>
      )}
    </div>
  )
}

export default function Arena() {
  const [matchId, setMatchId] = useState(() => localStorage.getItem(LAST_MATCH_KEY) ?? '')
  const [promptSide, setPromptSide] = useState<'white' | 'black'>('white')
  const [matchInfo, setMatchInfo] = useState<Match | null>(null)
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

    const wsBase = apiUrl.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsBase}/ws`)
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
    localStorage.setItem(LAST_MATCH_KEY, matchId.trim())

    try {
      const match = await getMatch(matchId)
      if (match.error) {
        setError(`${String(match.error)} — double-check the match ID`)
        setLoading(false)
        return
      }

      setStatus(match.status)
      setMatchInfo(match)

      const activeGame = match.games.find(g => g.status === 'active') || match.games[0]
      if (activeGame) {
        activeMatchRef.current = matchId
        gameIdRef.current = activeGame.id
        setPromptSide(activeGame.whitePlayerId === match.playerAId ? "white" : "black")
        await fetchGameState(matchId, activeGame.id)
        connectWebSocket(matchId)
      }
    } catch {
      setError('Failed to connect to match — is the server running? Check the ID and retry.')
    }

    setLoading(false)
  }

  // Auto-reconnect to the last match on load so an operator lands straight
  // on the live board. Runs once on mount only.
  const autoConnectRef = useRef(false)
  const connectRef = useRef(connectToMatch)
  connectRef.current = connectToMatch
  useEffect(() => {
    if (autoConnectRef.current) return
    autoConnectRef.current = true
    if (matchId.trim()) void connectRef.current()
  }, [matchId])

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

  // Bearer tokens pasted by the operator (from match creation); the LLM
  // receives its token inside the prompt text. Tokens belong to PLAYERS
  // (A/B), not colors — colors swap every game.
  const [tokenA, setTokenA] = useState("")
  const [tokenB, setTokenB] = useState("")

  // Build the prompt for the selected side (ADR-006 canonical template).
  // Uses the per-game display ID when the server provides one (Story 33).
  const getPromptFor = (side: 'white' | 'black') => {
    const game = matchInfo?.games.find(g => g.id === gameIdRef.current)
    // Is the player with this color player A? (colors swap per game)
    const sideIsPlayerA = game
      ? (side === 'white') === (game.whitePlayerId === matchInfo?.playerAId)
      : side === 'white'
    const playerIdForSide = sideIsPlayerA ? matchInfo?.playerAId : matchInfo?.playerBId
    const displayId = sideIsPlayerA ? game?.displayPlayerAId : game?.displayPlayerBId
    return PROMPT_TEMPLATE
      .replace('{PLAYER_ID}', displayId || playerIdForSide || `player-${side}`)
      .replace(/\{COLOR_NOTE\}/g, COLOR_NOTES[side])
      .replace(/\{COLOR\}/g, side)
      .replace('{TIME_CONTROL}', timeControl)
      .replace(/\{API_URL\}/g, apiUrl)
      .replace("{TOKEN}", (sideIsPlayerA ? tokenA : tokenB) || "<token-provided-separately>")
  }

  const getPrompt = () => getPromptFor(promptSide)

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(getPrompt())
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  // Broadcast nameplates: resolve each color's display ID for this game
  const activeGame = matchInfo?.games.find((g) => g.id === gameIdRef.current)
  const whiteIsA = activeGame && matchInfo ? activeGame.whitePlayerId === matchInfo.playerAId : true
  const whiteName = (whiteIsA ? activeGame?.displayPlayerAId : activeGame?.displayPlayerBId)
    ?? (whiteIsA ? matchInfo?.playerAId : matchInfo?.playerBId) ?? 'White'
  const blackName = (!whiteIsA ? activeGame?.displayPlayerAId : activeGame?.displayPlayerBId)
    ?? (!whiteIsA ? matchInfo?.playerAId : matchInfo?.playerBId) ?? 'Black'

  const formatClock = (seconds: number | undefined, label: string) => {
    if (seconds === undefined) return null
    const low = seconds <= 30
    return (
      <p>
        <small>{label}:{' '}
          <span className={low ? 'clock clock-low' : 'clock'}>
            {seconds}s{low ? ' — LOW TIME' : ''}
          </span>
        </small>
      </p>
    )
  }

  return (
    <div className="grid">
      <div>
        {/* Chess Board with broadcast nameplates */}
        {gameState ? (
          <>
            <Plaque glyph="♞" name={blackName} clock={gameState.clock.black} toMove={gameState.turn === 'black' && !gameState.isGameOver} />
            <ChessBoard fen={gameState.fen} />
            <div style={{ marginTop: '0.5rem' }}>
              <Plaque glyph="♙" name={whiteName} clock={gameState.clock.white} toMove={gameState.turn === 'white' && !gameState.isGameOver} />
            </div>
          </>
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
        {gameState && matchInfo?.playerAId && matchInfo?.playerBId && (
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
            <fieldset role="radiogroup" aria-label="Prompt side">
              <label style={{ marginRight: '1rem' }}>
                <input
                  type="radio"
                  name="prompt-side"
                  checked={promptSide === 'white'}
                  onChange={() => setPromptSide('white')}
                />{' '}
                White — {matchInfo.games.find(g => g.id === gameIdRef.current)?.displayPlayerAId || 'Player A'}
              </label>
              <label>
                <input
                  type="radio"
                  name="prompt-side"
                  checked={promptSide === 'black'}
                  onChange={() => setPromptSide('black')}
                />{' '}
                Black — {matchInfo.games.find(g => g.id === gameIdRef.current)?.displayPlayerBId || 'Player B'}
              </label>
            </fieldset>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <label>
                <small>Player A token (Bearer)</small>
                <input
                  type="password"
                  placeholder="paste playerAToken"
                  value={tokenA}
                  onChange={(e) => setTokenA(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label>
                <small>Player B token (Bearer)</small>
                <input
                  type="password"
                  placeholder="paste playerBToken"
                  value={tokenB}
                  onChange={(e) => setTokenB(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
            </div>
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
        {/* Connect — the entry action, so it leads the rail */}
        <article className="card">
          <header><strong>Connect to Match</strong></header>
          <p><small>Paste the match ID from Admin — press Enter or click Connect.</small></p>
          <form onSubmit={(e) => { e.preventDefault(); void connectToMatch() }}>
            <label>
              Match ID
              <input
                type="text"
                placeholder="e.g., MATCH-1787585865651-702F59"
                value={matchId}
                onChange={(evt) => setMatchId(evt.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button className="button" type="submit" disabled={loading} aria-busy={loading}>
              {loading ? 'Connecting...' : 'Connect'}
            </button>
          </form>
          {error && <p role="alert"><small>{error}</small></p>}
          {matchId && !gameState && !loading && !error && (
            <p><small>No board yet — click Connect to load this match.</small></p>
          )}
        </article>

        {/* Game Info */}
        <article className="card">
          <header>
            <strong>Game Info</strong>{' '}
            <span
              className="badge live-badge"
              data-live={wsConnected}
              data-variant={wsConnected ? "success" : "danger"}
              role="status"
            >
              {wsConnected ? 'Live' : 'Reconnecting'}
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
            <div className="moves-grid">
              {moves.map((move, i) => (
                <div key={i} className="move-row">
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

      </aside>
    </div>
  )
}
