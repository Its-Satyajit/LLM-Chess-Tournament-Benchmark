import { describe, it, expect } from 'vitest'
import { parseUciInfoLine, parseBestMoveLine, scoreToCentipawns } from './uciParser'

describe('uciParser', () => {
  describe('parseUciInfoLine', () => {
    it('parses standard info line with centipawn score', () => {
      const line = 'info depth 14 seldepth 20 multipv 1 score cp 45 nodes 18234 nps 150000 time 121 pv e2e4 e7e5 g1f3'
      const parsed = parseUciInfoLine(line)

      expect(parsed).toEqual({
        depth: 14,
        nodes: 18234,
        pv: ['e2e4', 'e7e5', 'g1f3'],
        score: {
          type: 'cp',
          value: 45,
        },
        time: 121,
      })
    })

    it('parses negative centipawn score', () => {
      const line = 'info depth 10 score cp -180 nodes 5000 time 40 pv d7d5 c2c4'
      const parsed = parseUciInfoLine(line)

      expect(parsed).toEqual({
        depth: 10,
        nodes: 5000,
        pv: ['d7d5', 'c2c4'],
        score: {
          type: 'cp',
          value: -180,
        },
        time: 40,
      })
    })

    it('parses mate score', () => {
      const line = 'info depth 12 score mate 3 nodes 8000 pv g4h5 g8h8'
      const parsed = parseUciInfoLine(line)

      expect(parsed).toEqual({
        depth: 12,
        nodes: 8000,
        pv: ['g4h5', 'g8h8'],
        score: {
          type: 'mate',
          value: 3,
        },
        time: undefined,
      })
    })

    it('returns null for non-info lines', () => {
      expect(parseUciInfoLine('uciok')).toBeNull()
      expect(parseUciInfoLine('readyok')).toBeNull()
      expect(parseUciInfoLine('Stockfish 10')).toBeNull()
    })
  })

  describe('parseBestMoveLine', () => {
    it('parses bestmove with ponder', () => {
      expect(parseBestMoveLine('bestmove e2e4 ponder e7e5')).toEqual({
        bestMove: 'e2e4',
        ponder: 'e7e5',
      })
    })

    it('parses bestmove without ponder', () => {
      expect(parseBestMoveLine('bestmove e7e8q')).toEqual({
        bestMove: 'e7e8q',
        ponder: undefined,
      })
    })

    it('returns null for non-bestmove lines', () => {
      expect(parseBestMoveLine('info depth 10 score cp 20')).toBeNull()
      expect(parseBestMoveLine('')).toBeNull()
    })
  })

  describe('scoreToCentipawns', () => {
    it('converts cp score directly', () => {
      expect(scoreToCentipawns({ type: 'cp', value: 75 })).toBe(75)
      expect(scoreToCentipawns({ type: 'cp', value: -120 })).toBe(-120)
    })

    it('converts mate score to bounded centipawn equivalent', () => {
      // Mate in 1 should be overwhelmingly winning (+10000)
      expect(scoreToCentipawns({ type: 'mate', value: 1 })).toBe(10000)
      // Mate in -1 should be overwhelmingly losing (-10000)
      expect(scoreToCentipawns({ type: 'mate', value: -1 })).toBe(-10000)
      // Mate in 5 should be slightly less than mate in 1
      expect(scoreToCentipawns({ type: 'mate', value: 5 })).toBe(9600)
    })
  })
})
