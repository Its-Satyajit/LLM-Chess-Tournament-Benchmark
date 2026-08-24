import { Chess } from 'chess.js'

export interface GameState {
  fen: string
  turn: 'white' | 'black'
  moveCount: number
  history: string[]
  isCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isDraw: boolean
  isGameOver: boolean
}

export interface MoveResult {
  accepted: boolean
  move?: string
  nextTurn?: 'white' | 'black'
  error?: string
  isGameOver?: boolean
  result?: GameResult
}

export interface GameResult {
  winner: 'white' | 'black' | null
  reason: 'checkmate' | 'stalemate' | 'repetition' | '50_move' | 'insufficient_material' | 'timeout' | 'resign' | 'draw_offer'
}

export class ChessGame {
  private chess: Chess

  constructor(fen?: string) {
    // Validate FEN before passing to chess.js
    if (fen) {
      // Normalize FEN - chess.js will handle validation
      this.chess = new Chess(fen)
    } else {
      this.chess = new Chess()
    }
  }

  static fromFEN(fen: string): ChessGame {
    return new ChessGame(fen)
  }

  static fromChess960Seed(seed: number): ChessGame {
    const pieces = ChessGame.generateChess960Pieces(seed)
    const fen = ChessGame.buildChess960FEN(pieces)
    return new ChessGame(fen)
  }

  private static generateChess960Pieces(seed: number): string[] {
    // Simple PRNG for Chess960 position generation
    const rng = ChessGame.createRNG(seed)
    
    // Start with empty 8-square back rank
    const pieces: string[] = []
    
    // Place bishops on opposite colors
    const lightSquares = [1, 3, 5, 7]
    const darkSquares = [0, 2, 4, 6]
    const bishop1 = lightSquares[Math.floor(rng() * lightSquares.length)]
    const bishop2 = darkSquares[Math.floor(rng() * darkSquares.length)]
    
    // Place all pieces in a temporary array
    const tempPieces: (string | null)[] = Array(8).fill(null)
    tempPieces[bishop1] = 'B'
    tempPieces[bishop2] = 'B'
    
    // Place queen
    const emptySquares = tempPieces.map((p, i) => p === null ? i : -1).filter(i => i !== -1)
    const queenPos = emptySquares[Math.floor(rng() * emptySquares.length)]
    tempPieces[queenPos] = 'Q'
    
    // Place knights
    const remainingEmpty = tempPieces.map((p, i) => p === null ? i : -1).filter(i => i !== -1)
    const knight1Pos = remainingEmpty[Math.floor(rng() * remainingEmpty.length)]
    tempPieces[knight1Pos] = 'N'
    const remainingAfterKnight1 = tempPieces.map((p, i) => p === null ? i : -1).filter(i => i !== -1)
    const knight2Pos = remainingAfterKnight1[Math.floor(rng() * remainingAfterKnight1.length)]
    tempPieces[knight2Pos] = 'N'
    
    // Place king between rooks
    const lastThree = tempPieces.map((p, i) => p === null ? i : -1).filter(i => i !== -1)
    const kingPos = lastThree[1] // King must be between rooks
    tempPieces[kingPos] = 'K'
    tempPieces[lastThree[0]] = 'R'
    tempPieces[lastThree[2]] = 'R'
    
    return tempPieces as string[]
  }

  private static buildChess960FEN(pieces: string[]): string {
    // pieces are uppercase for white back rank
    const backRank = pieces.join('')
    // Create full board FEN
    const pawnRank = 'pppppppp'
    const emptyRank = '8'
    return `${backRank.toLowerCase()}/${pawnRank}/${emptyRank}/${emptyRank}/${emptyRank}/${emptyRank}/PPPPPPPP/${backRank} w KQkq - 0 1`
  }

  private static createRNG(seed: number): () => number {
    let s = seed
    return () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      return s / 0x7fffffff
    }
  }

  getGameState(): GameState {
    const turn = this.chess.turn()
    return {
      fen: this.chess.fen(),
      turn: turn === 'w' ? 'white' : 'black',
      moveCount: this.chess.history().length,
      history: this.chess.history(),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isStalemate: this.chess.isStalemate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
    }
  }

  getLegalMoves(): string[] {
    return this.chess.moves()
  }

  makeMove(move: string): MoveResult {
    try {
      const result = this.chess.move(move)
      if (result) {
        const gameOver = this.chess.isGameOver()
        let gameResult: GameResult | undefined

        if (gameOver) {
          if (this.chess.isCheckmate()) {
            const winner = this.chess.turn() === 'w' ? 'black' : 'white'
            gameResult = {
              winner: winner as 'white' | 'black',
              reason: 'checkmate',
            }
          } else if (this.chess.isStalemate()) {
            gameResult = { winner: null, reason: 'stalemate' }
          } else if (this.chess.isDraw()) {
            // Determine the specific draw reason
            const history = this.chess.history()
            if (this.chess.isInsufficientMaterial()) {
              gameResult = { winner: null, reason: 'insufficient_material' }
            } else if (history.length >= 100) {
              gameResult = { winner: null, reason: '50_move' }
            } else {
              gameResult = { winner: null, reason: 'repetition' }
            }
          }
        }

        const nextTurn = this.chess.turn()
        return {
          accepted: true,
          move: result.san,
          nextTurn: nextTurn === 'w' ? 'white' : 'black',
          isGameOver: gameOver,
          result: gameResult,
        }
      }
      return { accepted: false, error: 'ILLEGAL_MOVE' }
    } catch {
      return { accepted: false, error: 'ILLEGAL_MOVE' }
    }
  }

  isGameOver(): boolean {
    return this.chess.isGameOver()
  }

  getResult(): GameResult | null {
    if (!this.chess.isGameOver()) {
      return null
    }

    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'black' : 'white'
      return {
        winner: winner as 'white' | 'black',
        reason: 'checkmate',
      }
    }

    if (this.chess.isStalemate()) {
      return { winner: null, reason: 'stalemate' }
    }

    if (this.chess.isInsufficientMaterial()) {
      return { winner: null, reason: 'insufficient_material' }
    }

    if (this.chess.isDraw()) {
      const history = this.chess.history()
      if (history.length >= 100) {
        return { winner: null, reason: '50_move' }
      }
      return { winner: null, reason: 'repetition' }
    }

    return null
  }
}
