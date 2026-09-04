import { describe, it, expect } from 'vitest'
import {
  calculateWinProbability,
  calculateMoveAccuracy,
  calculateAggregateAccuracy,
  classifyMove,
  calculateAcpl,
  estimatePerformanceRating,
  MOVE_CLASSIFICATIONS,
  type MoveClassificationType,
} from './metrics'

describe('Game Review Metrics', () => {
  describe('calculateWinProbability', () => {
    it('returns 50% for equal position (0 cp)', () => {
      const winProb = calculateWinProbability(0)
      expect(winProb).toBeCloseTo(50, 1)
    })

    it('returns ~99% for overwhelming white advantage (+1000 cp)', () => {
      const winProb = calculateWinProbability(1000)
      expect(winProb).toBeGreaterThan(95)
      expect(winProb).toBeLessThanOrEqual(100)
    })

    it('returns ~1% for overwhelming black advantage (-1000 cp)', () => {
      const winProb = calculateWinProbability(-1000)
      expect(winProb).toBeLessThan(5)
      expect(winProb).toBeGreaterThanOrEqual(0)
    })
  })

  describe('calculateMoveAccuracy', () => {
    it('gives 100% accuracy when evaluation does not drop', () => {
      // White moves from +50 cp to +100 cp (improved position)
      const acc = calculateMoveAccuracy({
        afterCp: 100,
        beforeCp: 50,
        turn: 'w',
      })
      expect(acc).toBe(100)
    })

    it('penalizes small loss with high accuracy (e.g. 90-98%)', () => {
      const acc = calculateMoveAccuracy({
        afterCp: 42,
        beforeCp: 50,
        turn: 'w',
      })
      expect(acc).toBeGreaterThanOrEqual(90)
      expect(acc).toBeLessThan(100)
    })

    it('drastically penalizes major blunders', () => {
      // White was +300 cp and drops to -400 cp
      const acc = calculateMoveAccuracy({
        afterCp: -400,
        beforeCp: 300,
        turn: 'w',
      })
      expect(acc).toBeLessThan(20)
      expect(acc).toBeGreaterThanOrEqual(0)
    })

    it('handles black turn evaluation properly', () => {
      // Black improves position from +100 (white favor) to -50 (black favor)
      const acc = calculateMoveAccuracy({
        afterCp: -50,
        beforeCp: 100,
        turn: 'b',
      })
      expect(acc).toBe(100)
    })
  })

  describe('calculateAggregateAccuracy', () => {
    it('computes weighted harmonic mean of ply accuracies', () => {
      const accuracies = [100, 95, 90, 85, 80]
      const avg = calculateAggregateAccuracy(accuracies)
      expect(avg).toBeGreaterThanOrEqual(85)
      expect(avg).toBeLessThanOrEqual(92)
    })

    it('returns 100% for empty move list', () => {
      expect(calculateAggregateAccuracy([])).toBe(100)
    })
  })

  describe('classifyMove', () => {
    it('classifies theoretical opening moves', () => {
      const classification = classifyMove({
        afterCp: 20,
        beforeCp: 20,
        bestMove: 'e2e4',
        isBook: true,
        playedMove: 'e2e4',
        ply: 1,
        turn: 'w',
      })
      expect(classification).toBe('theoretical')
    })

    it('classifies best move when matching engine top pick', () => {
      const classification = classifyMove({
        afterCp: 30,
        beforeCp: 30,
        bestMove: 'g1f3',
        isBook: false,
        playedMove: 'g1f3',
        ply: 10,
        turn: 'w',
      })
      expect(classification).toBe('best')
    })

    it('classifies brilliant move for sacrifice that preserves decisive advantage', () => {
      const classification = classifyMove({
        afterCp: 350,
        beforeCp: 300,
        bestMove: 'd1h5',
        isBook: false,
        isSacrifice: true,
        playedMove: 'd1h5',
        ply: 15,
        turn: 'w',
      })
      expect(classification).toBe('brilliant')
    })

    it('classifies very good move with tiny centipawn loss', () => {
      const classification = classifyMove({
        afterCp: 40,
        beforeCp: 55,
        bestMove: 'c2c4',
        isBook: false,
        playedMove: 'e2e4',
        ply: 8,
        turn: 'w',
      })
      expect(classification).toBe('veryGood')
    })

    it('classifies inaccuracy for moderate loss (e.g. 100 cp drop)', () => {
      const classification = classifyMove({
        afterCp: -30,
        beforeCp: 80,
        bestMove: 'c2c4',
        isBook: false,
        playedMove: 'h2h3',
        ply: 12,
        turn: 'w',
      })
      expect(classification).toBe('inaccuracy')
    })

    it('classifies mistake for substantial drop (e.g. 180 cp drop)', () => {
      const classification = classifyMove({
        afterCp: -80,
        beforeCp: 100,
        bestMove: 'e2e4',
        isBook: false,
        playedMove: 'f2f4',
        ply: 14,
        turn: 'w',
      })
      expect(classification).toBe('mistake')
    })

    it('classifies miss when throwing away a winning advantage', () => {
      const classification = classifyMove({
        afterCp: 20,
        beforeCp: 400,
        bestMove: 'e8e1',
        isBook: false,
        playedMove: 'a2a4',
        ply: 20,
        turn: 'w',
      })
      expect(classification).toBe('miss')
    })

    it('classifies blunder for huge centipawn loss', () => {
      const classification = classifyMove({
        afterCp: -450,
        beforeCp: 50,
        bestMove: 'd1d4',
        isBook: false,
        playedMove: 'd1e2',
        ply: 16,
        turn: 'w',
      })
      expect(classification).toBe('blunder')
    })
  })

  describe('MOVE_CLASSIFICATIONS metadata', () => {
    it('provides both Tournament and Streamer labels for all types', () => {
      const keys: MoveClassificationType[] = [
        'brilliant',
        'veryGood',
        'best',
        'excellent',
        'good',
        'theoretical',
        'inaccuracy',
        'mistake',
        'miss',
        'blunder',
      ]

      for (const key of keys) {
        expect(MOVE_CLASSIFICATIONS[key]).toBeDefined()
        expect(MOVE_CLASSIFICATIONS[key].tournament).toBeTruthy()
        expect(MOVE_CLASSIFICATIONS[key].streamer).toBeTruthy()
        expect(MOVE_CLASSIFICATIONS[key].color).toBeTruthy()
      }

      // Check specific dual labels requested by user
      expect(MOVE_CLASSIFICATIONS.brilliant.tournament).toBe('Brilliant Move')
      expect(MOVE_CLASSIFICATIONS.brilliant.streamer).toBe('Sigma')

      expect(MOVE_CLASSIFICATIONS.veryGood.tournament).toBe('Very Good Move')
      expect(MOVE_CLASSIFICATIONS.veryGood.streamer).toBe('Awesome')

      expect(MOVE_CLASSIFICATIONS.best.tournament).toBe('Best Move')
      expect(MOVE_CLASSIFICATIONS.best.streamer).toBe('Best')

      expect(MOVE_CLASSIFICATIONS.excellent.tournament).toBe('Excellent Move')
      expect(MOVE_CLASSIFICATIONS.excellent.streamer).toBe('Nice')

      expect(MOVE_CLASSIFICATIONS.good.tournament).toBe('Good Move')
      expect(MOVE_CLASSIFICATIONS.good.streamer).toBe('Ok')

      expect(MOVE_CLASSIFICATIONS.theoretical.tournament).toBe('Theoretical Move')
      expect(MOVE_CLASSIFICATIONS.theoretical.streamer).toBe('Theoretical')

      expect(MOVE_CLASSIFICATIONS.inaccuracy.tournament).toBe('Inaccuracy')
      expect(MOVE_CLASSIFICATIONS.inaccuracy.streamer).toBe('Strange')

      expect(MOVE_CLASSIFICATIONS.mistake.tournament).toBe('Mistake')
      expect(MOVE_CLASSIFICATIONS.mistake.streamer).toBe('Bad')

      expect(MOVE_CLASSIFICATIONS.miss.tournament).toBe('Miss')
      expect(MOVE_CLASSIFICATIONS.miss.streamer).toBe('Miss')

      expect(MOVE_CLASSIFICATIONS.blunder.tournament).toBe('Blunder')
      expect(MOVE_CLASSIFICATIONS.blunder.streamer).toBe('Clown')
    })
  })

  describe('calculateAcpl', () => {
    it('calculates average centipawn loss correctly', () => {
      const losses = [0, 10, 20, 50]
      expect(calculateAcpl(losses)).toBe(20)
    })

    it('returns 0 for empty array', () => {
      expect(calculateAcpl([])).toBe(0)
    })
  })

  describe('estimatePerformanceRating', () => {
    it('estimates GM/master rating for high accuracy (>95%) and low ACPL', () => {
      const rating = estimatePerformanceRating({ accuracy: 96, acpl: 12 })
      expect(rating).toBeGreaterThanOrEqual(2400)
    })

    it('estimates club player rating for mid accuracy (~80-85%) and ACPL ~35-50', () => {
      const rating = estimatePerformanceRating({ accuracy: 84.5, acpl: 40 })
      expect(rating).toBeGreaterThanOrEqual(1700)
      expect(rating).toBeLessThan(2300)
    })

    it('estimates novice rating for low accuracy (<60%) and high ACPL', () => {
      const rating = estimatePerformanceRating({ accuracy: 50, acpl: 150 })
      expect(rating).toBeLessThan(1200)
      expect(rating).toBeGreaterThanOrEqual(600)
    })
  })
})
