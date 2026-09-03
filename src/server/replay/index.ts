import { ChessGame } from '../chess/ChessGame'
import type { Game } from '../game/MatchEngine'

export interface ReplayFrame {
  moveNumber: number
  move: string
  fen: string
  timestamp: Date
  messages: {
    sender: string
    content: string
    timestamp: Date
  }[]
}

export interface ReplayData {
  gameId: string
  matchId: string
  result: {
    winner: 'white' | 'black' | null
    reason: string
  } | null
  initialFen: string
  frames: ReplayFrame[]
  totalMoves: number
}

export function generateReplay(game: Game): ReplayData {
  const frames: ReplayFrame[] = [],
   chess = new ChessGame(game.fenInitial)
  
  let moveIndex = 0
  for (const move of game.moves) {
    const result = chess.makeMove(move)
    if (!result.accepted) {continue}
    
    const state = chess.getGameState(),
    
    // Find messages around this move
     moveTime = game.createdAt.getTime() + moveIndex * 5000, // Approximate
     messages = game.messages
      .filter(m => m.timestamp.getTime() <= moveTime + 5000 && m.timestamp.getTime() > moveTime - 5000)
      .map(m => ({
        content: m.content,
        sender: 'opponent',
        timestamp: m.timestamp,
      }))
    
    frames.push({
      fen: state.fen,
      messages,
      move,
      moveNumber: Math.floor(moveIndex / 2) + 1,
      timestamp: new Date(moveTime),
    })
    
    moveIndex++
  }
  
  return {
    frames,
    gameId: game.id,
    initialFen: game.fenInitial,
    matchId: game.matchId,
    result: game.result,
    totalMoves: game.moveCount,
  }
}
