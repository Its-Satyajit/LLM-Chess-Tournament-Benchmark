import { useEffect, useRef } from 'react'
import ChessBoard from '../components/ChessBoard'
import Plaque from '../components/arena/Plaque'
import MatchConnectCard from '../components/arena/MatchConnectCard'
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
    error,
    loading,
    wsConnected,
    wsEvents,
    connectToMatch,
    selectGame,
  } = useArenaMatch()

  // Auto-connect to the last match on load so an operator lands straight on the live board.
  const hasAutoConnectedRef = useRef(false)
  useEffect(() => {
    if (!hasAutoConnectedRef.current && matchId.trim()) {
      hasAutoConnectedRef.current = true
      void connectToMatch(matchId)
    }
  }, [connectToMatch, matchId])

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
    <div className="grid">
      <div>
        {/* Chess Board with broadcast nameplates */}
        {gameState ? (
          <>
            <Plaque
              glyph="♞"
              name={blackName}
              clock={gameState.clock.black}
              toMove={gameState.turn === 'black' && !gameState.isGameOver}
            />
            <ChessBoard fen={gameState.fen} />
            <div style={{ marginTop: '0.5rem' }}>
              <Plaque
                glyph="♙"
                name={whiteName}
                clock={gameState.clock.white}
                toMove={gameState.turn === 'white' && !gameState.isGameOver}
              />
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
          <LlmPromptCard
            matchInfo={matchInfo}
            activeGameId={activeGameId}
            apiUrl={apiUrl}
          />
        )}
      </div>

      <aside>
        <MatchConnectCard
          matchId={matchId}
          onMatchIdChange={setMatchId}
          onConnect={() => void connectToMatch()}
          loading={loading}
          error={error}
          hasGameState={Boolean(gameState)}
        />

        <GameInfoCard
          wsConnected={wsConnected}
          status={status}
          gameState={gameState}
          matchInfo={matchInfo}
          matchId={matchId}
          activeGameId={activeGameId}
          onSelectGame={selectGame}
        />

        <MoveHistoryCard
          legalMoves={gameState?.legalMoves}
          moves={moves}
        />

        <WsEventsCard events={wsEvents} />
      </aside>
    </div>
  )
}
