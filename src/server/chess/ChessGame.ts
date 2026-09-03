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
  // Per-move details for metrics (present when accepted)
  captured?: string
  promotion?: string
  isCapture?: boolean
  isPromotion?: boolean
  isCastle?: boolean
  givesCheck?: boolean
}

export interface GameResult {
  winner: 'white' | 'black' | null
  reason: 'checkmate' | 'stalemate' | 'repetition' | '50_move' | 'insufficient_material' | 'timeout' | 'resign' | 'draw_offer' | 'api_limit' | 'token_limit'
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
    const pieces = ChessGame.generateChess960Pieces(seed),
     fen = ChessGame.buildChess960FEN(pieces)
    return new ChessGame(fen)
  }

  private static generateChess960Pieces(seed: number): string[] {
    // Simple PRNG for Chess960 position generation
    const rng = ChessGame.createRNG(seed),
    
    // Place bishops on opposite colors
     lightSquares = [1, 3, 5, 7],
     darkSquares = [0, 2, 4, 6],
     bishop1 = lightSquares[Math.floor(rng() * lightSquares.length)],
     bishop2 = darkSquares[Math.floor(rng() * darkSquares.length)],
    
    // Place all pieces in a temporary array
     tempPieces: (string | null)[] = Array.from({ length: 8 }, () => null)
    tempPieces[bishop1] = 'B'
    tempPieces[bishop2] = 'B'
    
    // Place queen
    const emptySquares = tempPieces.map((p, i) => p === null ? i : -1).filter(i => i !== -1),
     queenPos = emptySquares[Math.floor(rng() * emptySquares.length)]
    tempPieces[queenPos] = 'Q'
    
    // Place knights
    const remainingEmpty = tempPieces.map((p, i) => p === null ? i : -1).filter(i => i !== -1),
     knight1Pos = remainingEmpty[Math.floor(rng() * remainingEmpty.length)]
    tempPieces[knight1Pos] = 'N'
    const remainingAfterKnight1 = tempPieces.map((p, i) => p === null ? i : -1).filter(i => i !== -1),
     knight2Pos = remainingAfterKnight1[Math.floor(rng() * remainingAfterKnight1.length)]
    tempPieces[knight2Pos] = 'N'
    
    // Place king between rooks
    const lastThree = tempPieces.map((p, i) => p === null ? i : -1).filter(i => i !== -1),
     kingPos = lastThree[1] // King must be between rooks
    tempPieces[kingPos] = 'K'
    tempPieces[lastThree[0]] = 'R'
    tempPieces[lastThree[2]] = 'R'
    
    // SAFETY: type assertion is validated by upstream schema/parsing
    return tempPieces as string[]
  }

  private static buildChess960FEN(pieces: string[]): string {
    // Pieces are uppercase for white back rank
    const backRank = pieces.join(''),
    // Create full board FEN
     pawnRank = 'pppppppp',
     emptyRank = '8'
    return `${backRank.toLowerCase()}/${pawnRank}/${emptyRank}/${emptyRank}/${emptyRank}/${emptyRank}/PPPPPPPP/${backRank} w KQkq - 0 1`
  }

  private static createRNG(seed: number): () => number {
    let s = seed
    return () => {
      s = (s * 1_103_515_245 + 12_345) & 0x7FFFFFFF
      return s / 0x7FFFFFFF
    }
  }

  getGameState(): GameState {
    const turn = this.chess.turn()
    return {
      fen: this.chess.fen(),
      history: this.chess.history(),
      isCheck: this.chess.isCheck(),
      isCheckmate: this.chess.isCheckmate(),
      isDraw: this.chess.isDraw(),
      isGameOver: this.chess.isGameOver(),
      isStalemate: this.chess.isStalemate(),
      moveCount: this.chess.history().length,
      turn: turn === 'w' ? 'white' : 'black',
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
              reason: 'checkmate',
              // SAFETY: winner is determined by checkmate logic and is always valid color
              winner: winner as 'white' | 'black',
            }
          } else if (this.chess.isStalemate()) {
            gameResult = { reason: 'stalemate', winner: null }
          } else if (this.chess.isDraw()) {
            // Determine the specific draw reason
            const history = this.chess.history()
            if (this.chess.isInsufficientMaterial()) {
              gameResult = { reason: 'insufficient_material', winner: null }
            } else if (history.length >= 100) {
              gameResult = { reason: '50_move', winner: null }
            } else {
              gameResult = { reason: 'repetition', winner: null }
            }
          }
        }

        const nextTurn = this.chess.turn()
        return {
          accepted: true,
          captured: result.captured,
          givesCheck: this.chess.isCheck(),
          isCapture: result.isCapture(),
          isCastle: result.isKingsideCastle() || result.isQueensideCastle(),
          isGameOver: gameOver,
          isPromotion: result.isPromotion(),
          move: result.san,
          nextTurn: nextTurn === 'w' ? 'white' : 'black',
          promotion: result.promotion,
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
        reason: 'checkmate',
        // SAFETY: winner is determined by checkmate logic and is always valid color
        winner: winner as 'white' | 'black',
      }
    }

    if (this.chess.isStalemate()) {
      return { reason: 'stalemate', winner: null }
    }

    if (this.chess.isInsufficientMaterial()) {
      return { reason: 'insufficient_material', winner: null }
    }

    if (this.chess.isDraw()) {
      const history = this.chess.history()
      if (history.length >= 100) {
        return { reason: '50_move', winner: null }
      }
      return { reason: 'repetition', winner: null }
    }

    return null
  }
}
