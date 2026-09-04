import { useState, useEffect, useRef, useCallback, useId, useMemo } from 'react'
import { Chess } from 'chess.js'
import { getMatch, getGameState, type Match, type GameState } from '../lib/api'

export interface WsEvent {
  id: string
  type: string
  matchId: string
  gameId?: string
  gameNumber?: number
  whitePlayerId?: string
  blackPlayerId?: string
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
  timestamp: number
}

const WS_RECONNECT_MS = 3000
const LAST_MATCH_KEY = 'arena.lastMatchId'

export const apiUrl = globalThis.window !== undefined
  ? (globalThis.process?.env?.NEXT_PUBLIC_API_URL ?? globalThis.window.location.origin)
  : 'http://localhost:3000'

export function useArenaMatch() {
  const [matchId, setMatchId] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LAST_MATCH_KEY)
      if (saved) {
        setMatchId(saved)
      }
    }
  }, [])
  const [activeMatchId, setActiveMatchId] = useState('')
  const [matchInfo, setMatchInfo] = useState<Match | null>(null)
  const [activeGameId, setActiveGameId] = useState('')
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [moves, setMoves] = useState<string[]>([])
  const [status, setStatus] = useState('No match selected')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)
  const [wsEvents, setWsEvents] = useState<WsEvent[]>([])
  const [reconnectKey, setReconnectKey] = useState(0)

  // Last-move from/to squares for the board highlight. Replayed locally from
  // the SAN history against chess.js so it works on first load (no WS required)
  // and after reconnects / game switches.
  const lastMove = useMemo(() => {
    if (!moves.length) return null
    const replay = new Chess()
    let prev: { from: string; to: string } | null = null
    for (const san of moves) {
      try {
        const r = replay.move(san)
        if (r) prev = { from: r.from, to: r.to }
      } catch {
        return prev
      }
    }
    return prev
  }, [moves])

  const activeGameIdRef = useRef(activeGameId)
  useEffect(() => {
    activeGameIdRef.current = activeGameId
  }, [activeGameId])

  const eventIdPrefix = useId()

  const fetchGame = useCallback(async (mId: string, gId: string) => {
    try {
      const state = await getGameState(mId, gId)
      setGameState(state)
      setMoves(state.history ?? [])
    } catch {
      setError('Failed to fetch game state')
    }
  }, [])

  const refreshMatch = useCallback(async (mId: string) => {
    try {
      const m = await getMatch(mId)
      if (!m.error) {
        setMatchInfo(m)
      }
    } catch {
      // Silently ignore background refresh error
    }
  }, [])

  const selectGame = useCallback((gId: string) => {
    if (!activeMatchId) return
    setActiveGameId(gId)
    void fetchGame(activeMatchId, gId)
  }, [activeMatchId, fetchGame])

  const handleWsMessage = useCallback((event: MessageEvent, mId: string) => {
    try {
      // SAFETY: parsed event data conforms to WsEvent shape from server broadcaster
      const raw = JSON.parse(event.data) as Omit<WsEvent, 'id' | 'timestamp'>
      const data: WsEvent = {
        ...raw,
        id: `${eventIdPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      }
      setWsEvents(prev => [...prev.slice(-49), data])

      switch (data.type) {
        case 'subscribed':
          break
        case 'move_made':
          if (data.gameId && data.gameId === activeGameIdRef.current) {
            void fetchGame(mId, data.gameId)
          }
          break
        case 'game_started':
          if (data.gameId) {
            setActiveGameId(data.gameId)
            void fetchGame(mId, data.gameId)
            void refreshMatch(mId)
            setStatus(`Game ${data.gameNumber ?? ''} started`)
          }
          break
        case 'game_over':
          setStatus(`Game Over: ${data.result ?? ''} (${data.reason ?? ''})`)
          void refreshMatch(mId)
          break
        case 'match_over':
          setStatus(`Match Over: ${data.result ?? ''}`)
          void refreshMatch(mId)
          break
      }
    } catch {
      // Ignore parse errors
    }
  }, [eventIdPrefix, fetchGame, refreshMatch])

  // WebSocket lifecycle cleanly tied to activeMatchId with proper cleanup and reconnection
  useEffect(() => {
    if (!activeMatchId) return

    const wsBase = apiUrl.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsBase}/ws`)
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null

    ws.onopen = () => {
      setWsConnected(true)
      ws.send(JSON.stringify({ type: 'subscribe', matchId: activeMatchId }))
    }

    ws.onmessage = (event) => {
      handleWsMessage(event, activeMatchId)
    }

    ws.onclose = () => {
      setWsConnected(false)
      if (!reconnectTimeout) {
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null
          setReconnectKey((k) => k + 1)
        }, WS_RECONNECT_MS)
      }
    }

    ws.onerror = () => {
      setWsConnected(false)
    }

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      ws.close()
      setWsConnected(false)
    }
  }, [activeMatchId, handleWsMessage, reconnectKey])

  const connectToMatch = useCallback(async (targetId?: string) => {
    const idToUse = (targetId ?? matchId).trim()
    if (!idToUse) {
      setError('Enter a match ID')
      return
    }

    setLoading(true)
    setError('')
    localStorage.setItem(LAST_MATCH_KEY, idToUse)

    try {
      const match = await getMatch(idToUse)
      if (match.error) {
        setError(`${String(match.error)} — double-check the match ID`)
        return
      }

      setStatus(match.status)
      setMatchInfo(match)

      const activeGame = match.games.find(g => g.status === 'active') || match.games[0]
      if (activeGame) {
        setActiveGameId(activeGame.id)
        await fetchGame(idToUse, activeGame.id)
        setActiveMatchId(idToUse)
      }
    } catch {
      setError('Failed to connect to match — is the server running? Check the ID and retry.')
    } finally {
      setLoading(false)
    }
  }, [matchId, fetchGame])

  return {
    matchId,
    setMatchId,
    matchInfo,
    activeGameId,
    gameState,
    lastMove,
    moves,
    status,
    error,
    loading,
    wsConnected,
    wsEvents,
    connectToMatch,
    selectGame,
    refreshMatch,
    fetchGame,
  }
}
