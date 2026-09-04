import { describe, it, expect, beforeEach } from 'vitest'
import {
  reviewGame,
  getStoredGameReview,
  storeGameReview,
  type GameReviewReport,
} from './coordinator'
import type { PositionEvaluation } from '../stockfish/StockfishClient'

class MockStockfishClient {
  public evaluatedFens: string[] = []

  isReady(): boolean {
    return true
  }

  async init(): Promise<void> {}

  async evaluatePosition(fen: string, depth: number): Promise<PositionEvaluation> {
    this.evaluatedFens.push(fen)
    // Deterministic mock evaluation: +30 cp
    return {
      bestMove: 'e2e4',
      centipawns: 30,
      depth,
      fen,
      score: { type: 'cp', value: 30 },
    }
  }

  terminate(): void {}
}

describe('GameReview Coordinator & Storage', () => {
  beforeEach(() => {
    // Clear localStorage
    if (globalThis.window?.localStorage) {
      globalThis.window.localStorage.clear()
    }
  })

  describe('reviewGame', () => {
    it('analyzes game plies sequentially and computes review summary', async () => {
      const mockClient = new MockStockfishClient()
      const moves = ['e4', 'e5', 'Nf3', 'Nc6']
      const progressCalls: number[] = []

      const report = await reviewGame({
        depth: 10,
        gameId: 'game-123',
        matchId: 'match-abc',
        moves,
        onProgress: (p) => {
          progressCalls.push(p.percentage)
        },
        stockfishClient: mockClient,
      })

      expect(report.matchId).toBe('match-abc')
      expect(report.gameId).toBe('game-123')
      expect(report.depth).toBe(10)
      expect(report.plies).toHaveLength(4)

      // Verify progress callback was triggered
      expect(progressCalls.length).toBeGreaterThanOrEqual(4)
      expect(progressCalls[progressCalls.length - 1]).toBe(100)

      // Verify White and Black metrics are populated
      expect(report.white.accuracy).toBeGreaterThan(0)
      expect(report.white.estimatedRating).toBeGreaterThan(500)
      expect(report.black.accuracy).toBeGreaterThan(0)
      expect(report.black.estimatedRating).toBeGreaterThan(500)

      // Verify classification counts exist
      expect(report.white.classificationCounts.best).toBeDefined()
      expect(report.black.classificationCounts.best).toBeDefined()
    })

    it('returns empty review cleanly for game with zero moves', async () => {
      const mockClient = new MockStockfishClient()

      const report = await reviewGame({
        depth: 10,
        gameId: 'game-empty',
        matchId: 'match-abc',
        moves: [],
        stockfishClient: mockClient,
      })

      expect(report.plies).toHaveLength(0)
      expect(report.white.accuracy).toBe(100)
      expect(report.black.accuracy).toBe(100)
    })
  })

  describe('Storage persistence', () => {
    it('stores and retrieves game review report', () => {
      const mockReport: GameReviewReport = {
        analyzedAt: new Date().toISOString(),
        black: {
          acpl: 25,
          accuracy: 84.1,
          classificationCounts: {
            best: 18,
            blunder: 0,
            brilliant: 1,
            excellent: 1,
            good: 8,
            inaccuracy: 1,
            miss: 0,
            mistake: 2,
            theoretical: 2,
            veryGood: 0,
          },
          estimatedRating: 2150,
        },
        depth: 14,
        gameId: 'game-persist',
        matchId: 'match-persist',
        plies: [],
        white: {
          acpl: 20,
          accuracy: 85.0,
          classificationCounts: {
            best: 12,
            blunder: 0,
            brilliant: 0,
            excellent: 8,
            good: 6,
            inaccuracy: 3,
            miss: 0,
            mistake: 0,
            theoretical: 2,
            veryGood: 3,
          },
          estimatedRating: 2200,
        },
      }

      storeGameReview(mockReport)
      const retrieved = getStoredGameReview('match-persist', 'game-persist')

      expect(retrieved).toEqual(mockReport)
    })

    it('returns null when review is not cached', () => {
      expect(getStoredGameReview('none', 'none')).toBeNull()
    })
  })
})
