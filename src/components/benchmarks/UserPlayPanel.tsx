'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Crown, Bot, Loader2 } from 'lucide-react'
import ChessBoard from '../ChessBoard'
import {
  getMatch,
  getGameState,
  type BenchmarkSummary,
  type GameState,
  type Match,
} from '../../lib/api'

const POLL_MS = 3_000

function myColorForGame(game: Match['games'][number], myPlayerId: string): 'white' | 'black' | null {
  // Every game is between the two match participants: when white is not my
  // side, I hold the black pieces.
  if (game.whitePlayerId === myPlayerId) return 'white'
  return 'black'
}

export default function UserPlayPanel({ benchmark }: { benchmark: BenchmarkSummary }) {
  const matchId = benchmark.matchId
  const humanParticipant =
    benchmark.participants.playerA.kind === 'user' ? benchmark.participants.playerA : benchmark.participants.playerB
  const opponentParticipant =
    benchmark.participants.playerA.kind === 'user' ? benchmark.participants.playerB : benchmark.participants.playerA

  const [match, setMatch] = useState<Match | null>(null)
  const [gameId, setGameId] = useState('')
  const [state, setState] = useState<GameState | null>(null)
  const [myPlayerId, setMyPlayerId] = useState('')
  const [token, setToken] = useState('')
  const [move, setMove] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [lastResult, setLastResult] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!matchId) return
    try {
      const m = await getMatch(matchId)
      if (!mounted.current) return
      setMatch(m)
      if (m.error) {
        setError(m.error)
        return
      }
      const humanIsA = humanParticipant.kind === 'user'
      const mine = humanIsA ? m.playerAId : m.playerBId
      if (!mine) return
      setMyPlayerId(mine)

      const active = m.games.find((g) => g.status === 'active') ?? m.games[m.currentGameIndex] ?? m.games[0]
      if (!active) return
      if (mounted.current) setGameId(active.id)
      const s = await getGameState(matchId, active.id)
      if (!mounted.current) return
      setState(s)
      setError('')
    } catch {
      if (mounted.current) setError('Could not refresh the live game')
    }
  }, [matchId, humanParticipant.kind])

  // Poll the live game while the panel is open. refresh() only updates state
  // after awaiting the API (never synchronously), which the rule cannot model
  // across the useCallback boundary.
  // oxlint-disable react/set-state-in-effect -- intentional polling
  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])
  // oxlint-enable react/set-state-in-effect

  // Mint the user-side token once per match (server-issued, scoped to this match).
  useEffect(() => {
    let cancelled = false
    if (!matchId || !myPlayerId || token) return
    void fetch(`/api/match/${encodeURIComponent(matchId)}/token/${encodeURIComponent(myPlayerId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // SAFETY: token endpoint returns { token } validated by the server
        const body = (await res.json()) as { token?: string }
        if (!cancelled && body.token) setToken(body.token)
      })
      .catch(() => {
        if (!cancelled) setError('Could not fetch your player token')
      })
    return () => {
      cancelled = true
    }
  }, [matchId, myPlayerId, token])

  const activeGame = match?.games.find((g) => g.id === gameId) ?? null
  const myColor = activeGame ? myColorForGame(activeGame, myPlayerId) : null
  const gameOver = Boolean(state?.isGameOver) || activeGame?.status === 'completed'
  const myTurn = Boolean(myColor && state && !gameOver && state.turn === myColor)
  const humanLabel = humanParticipant.kind === 'user' ? humanParticipant.publicName : 'You'
  const opponentName = opponentParticipant.kind === 'model'
    ? opponentParticipant.model.name
    : opponentParticipant.publicName

  const handleSubmitMove = useCallback(
    async (san?: string) => {
      const mv = (san ?? move).trim()
      if (!mv || !matchId || !gameId || !myPlayerId || !token || !myColor) return
      setBusy(true)
      setError('')
      setLastResult('')
      try {
        const res = await fetch(`/api/match/${encodeURIComponent(matchId)}/move/${encodeURIComponent(gameId)}`, {
          body: JSON.stringify({ move: mv }),
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
        })
        // SAFETY: move endpoint returns JSON with accepted/error fields
        const body = (await res.json()) as { accepted?: boolean; error?: string }
        if (body.accepted) {
          setLastResult(`Played ${mv}`)
          setMove('')
          await refresh()
        } else {
          setError(body.error || 'Move rejected')
        }
      } catch {
        setError('Move request failed')
      } finally {
        setBusy(false)
      }
    },
    [gameId, matchId, move, myColor, myPlayerId, refresh, token],
  )

  if (!matchId) {
    return (
      <p className="rounded-lg border border-dashed border-[#2e3c54] bg-[#111620] px-3 py-2 text-xs text-slate-400">
        This benchmark has not produced a match yet.
      </p>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-emerald-500/20 bg-[#0f141d] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
          <Crown className="h-3.5 w-3.5" />
          <span>Play your side</span>
        </h4>
        <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400">
          <span className="rounded bg-[#1a2230] px-2 py-0.5">
            {humanLabel} {myColor ? `(${myColor})` : ''}
          </span>
          <span>vs</span>
          <span className="flex items-center gap-1 rounded bg-[#1a2230] px-2 py-0.5">
            <Bot className="h-3 w-3 text-slate-500" />
            {opponentName}
          </span>
          <span className="font-mono text-slate-600">{matchId}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_1fr]">
        <div className="w-56 sm:w-64">
          {state ? (
            <ChessBoard fen={state.fen} lastMove={null} />
          ) : (
            <div className="flex aspect-square items-center justify-center rounded-lg border border-[#2e3c54] bg-[#111620] text-xs text-slate-500">
              Loading board…
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {state && !gameOver && (
            <p className="text-xs text-slate-300">
              {myTurn ? (
                <span className="font-bold text-emerald-400">Your move — you are playing {myColor}.</span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Waiting for {opponentName} to move…
                </span>
              )}
            </p>
          )}
          {gameOver && (
            <p className="rounded-lg border border-[#242f42] bg-[#111620] px-3 py-2 text-xs text-amber-300">
              Game {activeGame?.gameNumber} over{activeGame?.result ? ` — ${activeGame.result.reason}` : ''}.
              {activeGame?.status === 'completed' && match?.status !== 'completed'
                ? ' Next game starts after the reset period.'
                : ''}
            </p>
          )}
          {state?.legalMoves && state.legalMoves.length > 0 && myTurn && (
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick moves</p>
              <div className="flex max-h-32 flex-wrap gap-1 overflow-auto">
                {state.legalMoves.map((san) => (
                  <button
                    key={san}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleSubmitMove(san)}
                    className="rounded border border-[#2e3c54] bg-[#1a2230] px-2 py-1 font-mono text-[11px] text-slate-200 transition hover:border-emerald-500/50 hover:bg-emerald-600/20 hover:text-white disabled:opacity-40"
                  >
                    {san}
                  </button>
                ))}
              </div>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSubmitMove()
            }}
            className="flex items-center gap-2"
          >
            <input
              value={move}
              onChange={(e) => setMove(e.target.value)}
              disabled={!myTurn || busy}
              placeholder={myTurn ? 'SAN move, e.g. Nf3' : 'Wait for your turn…'}
              aria-label="Your move in SAN notation"
              className="h-8 w-40 rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!myTurn || busy || !move.trim()}
              className="flex h-8 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-40"
            >
              <Crown className="h-3 w-3" />
              Move
            </button>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={busy}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2e3c54] bg-[#111620] text-slate-400 transition hover:text-white disabled:opacity-40"
              aria-label="Refresh board"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </form>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">
              {error}
            </p>
          )}
          {lastResult && <p className="text-xs text-emerald-400">{lastResult}</p>}
        </div>
      </div>
    </div>
  )
}
