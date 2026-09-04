'use client'

import { useReducer, useEffect, useMemo, useCallback, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Chess } from 'chess.js'
import { getGameState, getMatch, type GameState, type Match } from '../lib/api'
import ChessBoard from '../components/ChessBoard'
import GameReviewCard, { type ReviewMode } from '../components/GameReviewCard'
import EvalBar from '../components/EvalBar'
import AdvantageGraph from '../components/AdvantageGraph'
import { StockfishClient } from '../lib/stockfish/StockfishClient'
import {
  reviewGame,
  getStoredGameReview,
  type GameReviewReport,
  type ReviewProgress,
  type PlyReview,
} from '../lib/gameReview/coordinator'
import { MOVE_CLASSIFICATIONS } from '../lib/gameReview/metrics'
import { ArrowLeft, Film, Shield, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-react'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

interface ReplayState {
  gameState: GameState | null
  moves: string[]
  currentMove: number
  loading: boolean
  error: string
  matchInfo: Match | null
}

type MoveIndexFn = (prev: number) => number

function isMoveIndexFn(val: number | MoveIndexFn): val is MoveIndexFn {
  return typeof val === 'function'
}

type ReplayAction =
  | { type: 'LOAD_SUCCESS'; match: Match; state: GameState }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'SET_CURRENT_MOVE'; moveIndex: number | MoveIndexFn }

function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'LOAD_SUCCESS':
      return {
        ...state,
        currentMove: action.state.history.length,
        error: '',
        gameState: action.state,
        loading: false,
        matchInfo: action.match,
        moves: action.state.history,
      }
    case 'LOAD_ERROR':
      return {
        ...state,
        error: action.error,
        loading: false,
      }
    case 'SET_CURRENT_MOVE':
      return {
        ...state,
        currentMove: isMoveIndexFn(action.moveIndex)
          ? action.moveIndex(state.currentMove)
          : action.moveIndex,
      }
    default:
      return state
  }
}

export interface ReplayProps {
  matchId?: string
  gameId?: string
}

interface MoveItem {
  id: string
  move: string
  moveNumber: number
  ply: number
}

function MoveButton({
  item,
  currentMove,
  onSelect,
  plyReview,
  mode,
}: {
  item: MoveItem
  currentMove: number
  onSelect: (ply: number) => void
  plyReview?: PlyReview
  mode: ReviewMode
}) {
  const handleClick = useCallback(() => {
    onSelect(item.ply)
  }, [item.ply, onSelect])

  const isCurrent = item.ply === currentMove
  const isPast = item.ply < currentMove
  const meta = plyReview ? MOVE_CLASSIFICATIONS[plyReview.classification] : null
  const label = meta ? (mode === 'streamer' ? meta.streamer : meta.tournament) : null

  return (
    <button
      type="button"
      className={`flex items-center justify-between gap-1.5 rounded px-2 py-1 font-mono text-xs transition ${
        isCurrent
          ? 'bg-emerald-600 text-white font-bold shadow-sm'
          : isPast
            ? 'bg-[#111620] text-slate-200 hover:bg-[#1f2838]'
            : 'text-slate-500 hover:bg-[#111620] hover:text-slate-300'
      }`}
      onClick={handleClick}
      aria-label={`Jump to move ${item.ply}: ${item.move}`}
      aria-current={isCurrent ? 'true' : undefined}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="text-[10px] opacity-60 min-w-[1.2rem] text-right">{item.moveNumber}.</span>
        <span>{item.move}</span>
      </div>

      {plyReview && meta && (
        <span
          className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border ${meta.badgeBg} ${meta.badgeText}`}
          title={`${meta.tournament}: ${meta.description}`}
        >
          <span>{label}</span>
          <span className="opacity-80">
            {plyReview.centipawns >= 0 ? '+' : ''}
            {(plyReview.centipawns / 100).toFixed(1)}
          </span>
        </span>
      )}
    </button>
  )
}

export default function Replay({ matchId: propMatchId, gameId: propGameId }: ReplayProps) {
  const routeParams = useParams()
  // SAFETY: route params are strings populated by Next.js router
  const matchId = propMatchId ?? (routeParams?.matchId as string | undefined)
  // SAFETY: route params are strings populated by Next.js router
  const gameId = propGameId ?? (routeParams?.gameId as string | undefined)

  const [state, dispatch] = useReducer(replayReducer, {
    currentMove: 0,
    error: '',
    gameState: null,
    loading: true,
    matchInfo: null,
    moves: [],
  })

  const { gameState, moves, currentMove, loading, error, matchInfo } = state

  // Game Review state
  const [reviewReport, setReviewReport] = useState<GameReviewReport | null>(() => {
    if (matchId && gameId) {
      return getStoredGameReview(matchId, gameId)
    }
    return null
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [reviewProgress, setReviewProgress] = useState<ReviewProgress | null>(null)
  const [reviewMode, setReviewMode] = useState<ReviewMode>('tournament')
  const [reviewDepth, setReviewDepth] = useState<number>(10)

  const setCurrentMove = useCallback((val: number | MoveIndexFn) => {
    dispatch({ moveIndex: val, type: 'SET_CURRENT_MOVE' })
  }, [])

  const handleStart = useCallback(() => {
    setCurrentMove(0)
  }, [setCurrentMove])

  const handlePrev = useCallback(() => {
    setCurrentMove((m) => Math.max(0, m - 1))
  }, [setCurrentMove])

  const handleNext = useCallback(() => {
    setCurrentMove((m) => Math.min(moves.length, m + 1))
  }, [moves.length, setCurrentMove])

  const handleEnd = useCallback(() => {
    setCurrentMove(moves.length)
  }, [moves.length, setCurrentMove])

  const handleSelectPly = useCallback(
    (ply: number) => {
      setCurrentMove(ply)
    },
    [setCurrentMove],
  )

  const handleRetry = useCallback(() => {
    window.location.reload()
  }, [])

  const handleToggleMode = useCallback(() => {
    setReviewMode((prev) => (prev === 'tournament' ? 'streamer' : 'tournament'))
  }, [])

  // Parse moves list into items for display
  const moveList = useMemo(
    () =>
      moves.map((move, i) => ({
        id: `${gameId || 'g'}-ply-${i + 1}-${move}`,
        move,
        moveNumber: Math.floor(i / 2) + 1,
        ply: i + 1,
      })),
    [moves, gameId],
  )

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!matchId || !gameId) {
        if (!cancelled) {
          dispatch({
            error: 'Missing matchId or gameId in URL — expected /replay/:matchId/:gameId',
            type: 'LOAD_ERROR',
          })
        }
        return
      }

      try {
        const [match, gameStateData] = await Promise.all([
          getMatch(matchId),
          getGameState(matchId, gameId),
        ])

        if (!cancelled) {
          dispatch({ match, state: gameStateData, type: 'LOAD_SUCCESS' })
        }
      } catch {
        if (!cancelled) {
          dispatch({
            error: 'Failed to load game data. Check the match ID and try again.',
            type: 'LOAD_ERROR',
          })
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
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

  const fen = fenHistory[currentMove] ?? fenHistory[fenHistory.length - 1] ?? ''

  // Current ply review evaluation for EvalBar
  const currentPlyReview = useMemo(() => {
    if (!reviewReport || currentMove === 0) return null
    return reviewReport.plies.find((p) => p.ply === currentMove) ?? null
  }, [reviewReport, currentMove])

  // Map plies by ply number for quick scoresheet lookup
  const plyReviewsByPly = useMemo(() => {
    if (!reviewReport) return new Map<number, PlyReview>()
    const map = new Map<number, PlyReview>()
    for (const ply of reviewReport.plies) {
      map.set(ply.ply, ply)
    }
    return map
  }, [reviewReport])

  // Start Stockfish review handler
  const handleStartReview = useCallback(async () => {
    if (!matchId || !gameId || moves.length === 0 || isAnalyzing) return

    setIsAnalyzing(true)
    setReviewProgress({ currentPly: 0, percentage: 0, totalPlies: moves.length })

    try {
      const client = new StockfishClient()
      const report = await reviewGame({
        depth: reviewDepth,
        gameId,
        matchId,
        moves,
        onProgress: (p) => setReviewProgress(p),
        stockfishClient: client,
      })
      client.terminate()
      setReviewReport(report)
    } catch (err) {
      console.error('Stockfish game review error:', err)
    } finally {
      setIsAnalyzing(false)
      setReviewProgress(null)
    }
  }, [matchId, gameId, moves, reviewDepth, isAnalyzing])

  // ← / → step through moves; Home/End jump to start/latest.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'Home') handleStart()
      else if (e.key === 'End') handleEnd()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handlePrev, handleNext, handleStart, handleEnd])

  const game = matchInfo?.games?.find((g) => g.id === gameId)

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-slate-400" aria-busy="true">
        Loading game replay...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-[#161d2a] p-6 text-center">
        <p role="alert" className="text-sm font-semibold text-rose-400 mb-4">{error}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-500"
            onClick={handleRetry}
          >
            Retry
          </button>
          <Link
            href="/#arena"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Back to Arena
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242f42] pb-3">
        <div className="flex items-center gap-3">
          <Link
            href="/#arena"
            className="flex items-center gap-1.5 rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 py-1 text-xs font-semibold text-slate-300 transition hover:bg-[#1a2230]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </Link>
          <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <Film className="h-5 w-5 text-emerald-400" />
            <span>Game Replay Theatre</span>
          </h2>
          {game && (
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
              Game {game.gameNumber} • {game.status} • {String(game.result) || 'in progress'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Board, EvalBar, Transport Navigator & Advantage Graph */}
        <div className="lg:col-span-6 xl:col-span-5 space-y-3">
          {/* Chessboard with EvalBar */}
          <div className="flex justify-center items-stretch gap-2.5">
            {currentPlyReview ? (
              <EvalBar centipawns={currentPlyReview.centipawns} />
            ) : (
              <div
                className="w-7 rounded-md border border-[#242f42] bg-[#111620] opacity-40 flex items-center justify-center text-[10px] text-slate-500 font-mono"
                title="Stockfish evaluation pending review"
              >
                --
              </div>
            )}

            <div className="flex justify-center flex-1">
              {fen ? (
                <ChessBoard fen={fen} />
              ) : (
                <div className="board-empty">
                  <Shield className="h-10 w-10 text-slate-500" />
                </div>
              )}
            </div>
          </div>

          {/* Playback Controls Card */}
          <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3 shadow-md space-y-3">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-[#242f42] pb-2">
              <span>Playback Transport</span>
              <span className="font-mono text-emerald-400">
                Ply {currentMove} / {moves.length}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-[#1c2536] hover:text-white"
                onClick={handleStart}
              >
                <SkipBack className="h-3.5 w-3.5" />
                <span>Start</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-[#1c2536] hover:text-white disabled:opacity-40"
                onClick={handlePrev}
                disabled={currentMove === 0}
                aria-label="Previous move"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-[#1c2536] hover:text-white disabled:opacity-40"
                onClick={handleNext}
                disabled={currentMove === moves.length}
                aria-label="Next move"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded-lg border border-[#2e3c54] bg-[#111620] px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-[#1c2536] hover:text-white"
                onClick={handleEnd}
              >
                <span>End</span>
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-500">
              Keyboard: <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono">←</kbd> <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono">→</kbd> or <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono">Home</kbd> / <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono">End</kbd>
            </p>
          </div>

          {/* Advantage Timeline Graph */}
          {reviewReport && reviewReport.plies.length > 0 && (
            <AdvantageGraph
              plies={reviewReport.plies}
              currentPly={currentMove}
              onSelectPly={handleSelectPly}
            />
          )}
        </div>

        {/* Game Review Card, Telemetry & Scoresheet */}
        <div className="lg:col-span-6 xl:col-span-7 space-y-3">
          {/* Stockfish Game Review Card */}
          <GameReviewCard
            report={reviewReport}
            isAnalyzing={isAnalyzing}
            progress={reviewProgress}
            onStartReview={handleStartReview}
            mode={reviewMode}
            onToggleMode={handleToggleMode}
            depth={reviewDepth}
            onChangeDepth={setReviewDepth}
            whitePlayerName={game?.whitePlayerId ?? matchInfo?.playerAId ?? 'White'}
            blackPlayerName={
              game?.whitePlayerId === matchInfo?.playerAId
                ? matchInfo?.playerBId ?? 'Black'
                : matchInfo?.playerAId ?? 'Black'
            }
          />

          {/* Game Telemetry Card */}
          <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3.5 shadow-md">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Game Telemetry
            </div>
            {gameState && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">
                  Turn: <strong className="capitalize text-white">{gameState.turn}</strong>
                </span>
                {gameState.clock.white !== undefined && (
                  <span className="rounded bg-slate-800 px-2 py-1 font-mono text-slate-300">
                    White: <strong>{gameState.clock.white}s</strong>
                  </span>
                )}
                {gameState.clock.black !== undefined && (
                  <span className="rounded bg-slate-800 px-2 py-1 font-mono text-slate-300">
                    Black: <strong>{gameState.clock.black}s</strong>
                  </span>
                )}
                {gameState.isCheck && <span className="rounded bg-amber-500/20 px-2 py-1 text-amber-300 font-bold">Check!</span>}
                {gameState.isCheckmate && <span className="rounded bg-rose-500/20 px-2 py-1 text-rose-300 font-bold">Checkmate!</span>}
                {gameState.isStalemate && <span className="rounded bg-blue-500/20 px-2 py-1 text-blue-300">Stalemate</span>}
                {gameState.isDraw && <span className="rounded bg-slate-700 px-2 py-1 text-slate-300">Draw</span>}
              </div>
            )}
          </div>

          {/* Moves Scoresheet Card */}
          <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3.5 shadow-md">
            <div className="mb-2 flex items-center justify-between border-b border-[#242f42] pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Interactive Scoresheet</span>
              <span className="font-mono text-slate-500">{moves.length} moves</span>
            </div>

            {moves.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">No moves in this game.</p>
            ) : (
              <div className="grid max-h-[22rem] grid-cols-2 gap-1 overflow-y-auto pr-1">
                {moveList.map((item) => (
                  <MoveButton
                    key={item.id}
                    item={item}
                    currentMove={currentMove}
                    onSelect={handleSelectPly}
                    plyReview={plyReviewsByPly.get(item.ply)}
                    mode={reviewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
