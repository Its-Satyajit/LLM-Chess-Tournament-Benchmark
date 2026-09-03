import { useCallback } from 'react'
import Link from 'next/link'
import { AlertTriangle, Flag, Circle } from 'lucide-react'
import type { Match, GameState } from '../../lib/api'

export interface GameInfoCardProps {
  wsConnected: boolean
  status: string
  gameState: GameState | null
  matchInfo: Match | null
  matchId: string
  activeGameId: string
  onSelectGame: (gameId: string) => void
}

function SelectGameButton({
  gameId,
  gameNumber,
  status,
  isSelected,
  onSelectGame,
}: {
  gameId: string
  gameNumber: number
  status: string
  isSelected: boolean
  onSelectGame: (id: string) => void
}) {
  const handleClick = useCallback(() => {
    onSelectGame(gameId)
  }, [gameId, onSelectGame])

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
        isSelected
          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/40'
          : 'border border-[#2e3c54] bg-[#111620] text-slate-300 hover:bg-[#1a2230] hover:text-white'
      }`}
    >
      G{gameNumber} <span className="text-[10px] opacity-75">({status})</span>
    </button>
  )
}

export default function GameInfoCard({
  wsConnected,
  status,
  gameState,
  matchInfo,
  matchId,
  activeGameId,
  onSelectGame,
}: GameInfoCardProps) {
  return (
    <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3.5 shadow-md">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between border-b border-[#242f42] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Match Telemetry</span>
          <span className="text-xs font-semibold text-slate-200">• {status}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              wsConnected ? 'bg-emerald-400 live-indicator' : 'bg-rose-400 animate-ping'
            }`}
          />
          <output aria-live="polite" className="text-[11px] font-bold text-slate-300">
            {wsConnected ? 'Live' : 'Reconnecting'}
          </output>
        </div>
      </div>

      {/* Turn & Status Alerts */}
      {gameState && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-[#2e3c54] bg-[#111620] px-2.5 py-1 text-xs">
            <span className="text-slate-400">Turn:</span>
            <span className="font-bold capitalize text-slate-100">{gameState.turn}</span>
            <Circle className={`h-2.5 w-2.5 fill-current ${gameState.turn === 'white' ? 'text-amber-100' : 'text-slate-500'}`} />
          </div>

          {gameState.isCheck && (
            <span className="flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              <span>Check</span>
            </span>
          )}
          {gameState.isCheckmate && (
            <span className="flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-300">
              <Flag className="h-3 w-3" />
              <span>Checkmate!</span>
            </span>
          )}
          {gameState.isStalemate && (
            <span className="rounded-md border border-blue-500/40 bg-blue-500/15 px-2 py-0.5 text-xs font-bold text-blue-300">
              Stalemate
            </span>
          )}
          {gameState.isDraw && (
            <span className="rounded-md border border-slate-500/40 bg-slate-500/20 px-2 py-0.5 text-xs font-bold text-slate-300">
              Draw
            </span>
          )}
        </div>
      )}

      {/* Match Games Navigation */}
      {matchInfo && matchInfo.games.length > 0 && (
        <div className="mt-3 border-t border-[#242f42] pt-2.5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>Series Games ({matchInfo.games.length}):</span>
            {activeGameId && (
              <Link
                href={`/replay/${matchId}/${activeGameId}`}
                className="text-emerald-400 transition hover:underline"
              >
                Open Replay →
              </Link>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {matchInfo.games.map((g) => (
              <SelectGameButton
                key={g.id}
                gameId={g.id}
                gameNumber={g.gameNumber}
                status={g.status}
                isSelected={g.id === activeGameId}
                onSelectGame={onSelectGame}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
