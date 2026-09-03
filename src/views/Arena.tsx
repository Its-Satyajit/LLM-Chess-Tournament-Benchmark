'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ChessBoard from '../components/ChessBoard'
import Plaque from '../components/arena/Plaque'
import QuickLaunchBar from '../components/arena/QuickLaunchBar'
import GameInfoCard from '../components/arena/GameInfoCard'
import LlmPromptCard from '../components/arena/LlmPromptCard'
import MoveHistoryCard from '../components/arena/MoveHistoryCard'
import WsEventsCard from '../components/arena/WsEventsCard'
import { useArenaMatch, apiUrl } from '../hooks/useArenaMatch'

export default function Arena() {
  const {
    matchId,
    setMatchId,
    matchInfo,
    activeGameId,
    gameState,
    moves,
    status,
    loading,
    wsConnected,
    wsEvents,
    connectToMatch,
    selectGame,
  } = useArenaMatch()

  const [activeTokens, setActiveTokens] = useState<{ black: string; white: string } | null>(null)

  // Auto-connect to the last match on load so an operator lands straight on the live board.
  const hasAutoConnectedRef = useRef(false)
  useEffect(() => {
    if (!hasAutoConnectedRef.current && matchId.trim()) {
      hasAutoConnectedRef.current = true
      void connectToMatch(matchId)
    }
  }, [connectToMatch, matchId])

  const handleLaunchConnect = useCallback(
    (newMatchId: string) => {
      setMatchId(newMatchId)
      void connectToMatch(newMatchId)
    },
    [setMatchId, connectToMatch],
  )

  const handleTokensReceived = useCallback((tokens: { black: string; white: string }) => {
    setActiveTokens(tokens)
  }, [])

  // Resolve broadcast nameplates for current game
  const activeGame = matchInfo?.games.find((g) => g.id === activeGameId)
  const whiteIsA = activeGame && matchInfo ? activeGame.whitePlayerId === matchInfo.playerAId : true
  const whiteName =
    (whiteIsA ? activeGame?.displayPlayerAId : activeGame?.displayPlayerBId) ??
    (whiteIsA ? matchInfo?.playerAId : matchInfo?.playerBId) ??
    'White'
  const blackName =
    (!whiteIsA ? activeGame?.displayPlayerAId : activeGame?.displayPlayerBId) ??
    (!whiteIsA ? matchInfo?.playerAId : matchInfo?.playerBId) ??
    'Black'

  return (
    <div className="space-y-4">
      {/* Low-Click Quick Launcher Bar */}
      <QuickLaunchBar
        currentMatchId={matchId}
        onConnectMatch={handleLaunchConnect}
        onTokensReceived={handleTokensReceived}
        loading={loading}
      />

      {/* Main High-Density Workspace Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left Column: Chessboard & Clocks (5 cols on lg, 6 cols on xl) */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-2">
          {gameState ? (
            <div className="space-y-2">
              <Plaque
                glyph="♞"
                name={blackName}
                clock={gameState.clock.black}
                toMove={gameState.turn === 'black' && !gameState.isGameOver}
              />

              <div className="flex justify-center">
                <ChessBoard fen={gameState.fen} />
              </div>

              <Plaque
                glyph="♙"
                name={whiteName}
                clock={gameState.clock.white}
                toMove={gameState.turn === 'white' && !gameState.isGameOver}
              />
            </div>
          ) : (
            <div className="board-empty p-8">
              <div className="space-y-2">
                <div className="text-4xl">♟️</div>
                <p className="text-sm font-semibold text-slate-200">Enter a Match ID to connect</p>
                <p className="text-xs text-slate-400">
                  Or use the <span className="text-emerald-400 font-semibold">1-Click Launch</span> bar above to start a match instantly.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Game Telemetry, Runner & History (7 cols on lg, 7 cols on xl) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-3">
          <GameInfoCard
            wsConnected={wsConnected}
            status={status}
            gameState={gameState}
            matchInfo={matchInfo}
            matchId={matchId}
            activeGameId={activeGameId}
            onSelectGame={selectGame}
          />

          {/* Prompt for LLM with auto-bound tokens */}
          {matchInfo && (
            <LlmPromptCard
              matchInfo={matchInfo}
              activeGameId={activeGameId}
              apiUrl={apiUrl}
              tokens={activeTokens}
            />
          )}

          {/* Collapsible/Tabbed or Compact Move History & Live Telemetry */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MoveHistoryCard moves={moves} />
            <WsEventsCard events={wsEvents} />
          </div>
        </div>
      </div>
    </div>
  )
}
