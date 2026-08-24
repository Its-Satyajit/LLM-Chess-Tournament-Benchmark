import { describe, expect, it } from 'vitest'
import { ChessGame } from './ChessGame'

describe('ChessGame', () => {
  describe('initialization', () => {
    it('should create a game with standard starting position', () => {
      const game = new ChessGame(),
       state = game.getGameState()
      expect(state.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      expect(state.turn).toBe('white')
      expect(state.moveCount).toBe(0)
    })

    it('should create a game with custom FEN', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
       game = new ChessGame(fen),
       state = game.getGameState()
      expect(state.fen).toBe(fen)
      expect(state.turn).toBe('black')
    })
  })

  describe('makeMove', () => {
    it('should accept valid move', () => {
      const game = new ChessGame(),
       result = game.makeMove('e4')
      expect(result.accepted).toBe(true)
      expect(result.nextTurn).toBe('black')
    })

    it('should reject illegal move', () => {
      const game = new ChessGame(),
       result = game.makeMove('e5')
      expect(result.accepted).toBe(false)
      expect(result.error).toBe('ILLEGAL_MOVE')
    })

    it('should update game state after valid move', () => {
      const game = new ChessGame()
      game.makeMove('e4')
      const state = game.getGameState()
      expect(state.turn).toBe('black')
      expect(state.moveCount).toBe(1)
      expect(state.history).toContain('e4')
    })
  })

  describe('getLegalMoves', () => {
    it('should return legal moves for white in starting position', () => {
      const game = new ChessGame(),
       moves = game.getLegalMoves()
      expect(moves).toContain('e4')
      expect(moves).toContain('d4')
      expect(moves).toContain('Nf3')
      expect(moves.length).toBe(20)
    })

    it('should return legal moves for black after white moves', () => {
      const game = new ChessGame()
      game.makeMove('e4')
      const moves = game.getLegalMoves()
      expect(moves).toContain('e5')
      expect(moves).toContain('d5')
      expect(moves).toContain('Nf6')
    })
  })

  describe('game over detection', () => {
    it('should detect checkmate', () => {
      // Scholar's mate
      const game = new ChessGame()
      game.makeMove('e4')
      game.makeMove('e5')
      game.makeMove('Bc4')
      game.makeMove('Nc6')
      game.makeMove('Qh5')
      game.makeMove('Nf6')
      game.makeMove('Qxf7')
      expect(game.isGameOver()).toBe(true)
      expect(game.getResult()).toEqual({ reason: 'checkmate', winner: 'white' })
    })

    it('should detect stalemate', () => {
      // Stalemate position - Black King a8, White King b6, White Queen c7
      const fen = 'k7/2Q5/1K6/8/8/8/8/8 b - - 0 1',
       game = new ChessGame(fen)
      expect(game.isGameOver()).toBe(true)
      expect(game.getResult()).toEqual({ reason: 'stalemate', winner: null })
    })

    it('should detect draw by insufficient material', () => {
      // King vs King
      const fen = '8/8/4k3/8/8/4K3/8/8 w - - 0 1',
       game = new ChessGame(fen)
      expect(game.isGameOver()).toBe(true)
      expect(game.getResult()).toEqual({ reason: 'insufficient_material', winner: null })
    })
  })

  describe('Chess960', () => {
    it('should generate Chess960 position from seed', () => {
      const game = ChessGame.fromChess960Seed(12_345),
       state = game.getGameState()
      expect(state.fen).toBeDefined()
      expect(state.turn).toBe('white')
    })

    it('should generate different positions for different seeds', () => {
      const game1 = ChessGame.fromChess960Seed(12_345),
       game2 = ChessGame.fromChess960Seed(67_890)
      expect(game1.getGameState().fen).not.toBe(game2.getGameState().fen)
    })

    it('should generate same position for same seed', () => {
      const game1 = ChessGame.fromChess960Seed(12_345),
       game2 = ChessGame.fromChess960Seed(12_345)
      expect(game1.getGameState().fen).toBe(game2.getGameState().fen)
    })
  })

  describe('fromFEN', () => {
    it('should restore game from FEN', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
       game = ChessGame.fromFEN(fen),
       state = game.getGameState()
      expect(state.fen).toBe(fen)
      expect(state.turn).toBe('black')
    })
  })
})
