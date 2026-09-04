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

    it('parses negative mate score', () => {
      const line = 'info depth 8 score mate -2 nodes 3200 pv f7f8q e8f8'
      const parsed = parseUciInfoLine(line)

      expect(parsed).toEqual({
        depth: 8,
        nodes: 3200,
        pv: ['f7f8q', 'e8f8'],
        score: {
          type: 'mate',
          value: -2,
        },
        time: undefined,
      })
    })

    it('parses info line with zero centipawns and no pv', () => {
      const line = 'info depth 20 score cp 0 nodes 99999 time 500'
      const parsed = parseUciInfoLine(line)

      expect(parsed).toEqual({
        depth: 20,
        nodes: 99999,
        pv: undefined,
        score: {
          type: 'cp',
          value: 0,
        },
        time: 500,
      })
    })

    it('handles malformed or truncated info lines gracefully', () => {
      expect(parseUciInfoLine('info')).toBeNull()
      expect(parseUciInfoLine('info depth')).toEqual({ depth: 0 })
      expect(parseUciInfoLine('info score')).toEqual({ depth: 0 })
      expect(parseUciInfoLine('info score invalid 10')).toEqual({ depth: 0 })
    })

    it('returns null for non-info lines and empty strings', () => {
      expect(parseUciInfoLine('uciok')).toBeNull()
      expect(parseUciInfoLine('readyok')).toBeNull()
      expect(parseUciInfoLine('Stockfish 10')).toBeNull()
      expect(parseUciInfoLine('')).toBeNull()
      expect(parseUciInfoLine('   ')).toBeNull()
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

    it('parses special bestmove tokens like (none) and null moves', () => {
      expect(parseBestMoveLine('bestmove (none)')).toEqual({
        bestMove: '(none)',
        ponder: undefined,
      })
      expect(parseBestMoveLine('bestmove 0000')).toEqual({
        bestMove: '0000',
        ponder: undefined,
      })
    })

    it('handles extra whitespace around bestmove line', () => {
      expect(parseBestMoveLine('   bestmove   d2d4   ponder   d7d5   ')).toEqual({
        bestMove: 'd2d4',
        ponder: 'd7d5',
      })
    })

    it('returns null for non-bestmove lines', () => {
      expect(parseBestMoveLine('info depth 10 score cp 20')).toBeNull()
      expect(parseBestMoveLine('')).toBeNull()
      expect(parseBestMoveLine('bestmove')).toBeNull()
    })
  })

  describe('scoreToCentipawns', () => {
    it('converts cp score directly including zero', () => {
      expect(scoreToCentipawns({ type: 'cp', value: 75 })).toBe(75)
      expect(scoreToCentipawns({ type: 'cp', value: -120 })).toBe(-120)
      expect(scoreToCentipawns({ type: 'cp', value: 0 })).toBe(0)
    })

    it('converts mate score to bounded centipawn equivalent', () => {
      // Mate in 1 should be overwhelmingly winning (+10000)
      expect(scoreToCentipawns({ type: 'mate', value: 1 })).toBe(10000)
      // Mate in -1 should be overwhelmingly losing (-10000)
      expect(scoreToCentipawns({ type: 'mate', value: -1 })).toBe(-10000)
      // Mate in 2 and 3
      expect(scoreToCentipawns({ type: 'mate', value: 2 })).toBe(9900)
      expect(scoreToCentipawns({ type: 'mate', value: 3 })).toBe(9800)
      // Mate in 5 should be slightly less than mate in 1
      expect(scoreToCentipawns({ type: 'mate', value: 5 })).toBe(9600)
      // Negative mate in -2 and -5
      expect(scoreToCentipawns({ type: 'mate', value: -2 })).toBe(-9900)
      expect(scoreToCentipawns({ type: 'mate', value: -5 })).toBe(-9600)
      // Distant mate score clamps at minimum magnitude 1000
      expect(scoreToCentipawns({ type: 'mate', value: 150 })).toBe(1000)
      expect(scoreToCentipawns({ type: 'mate', value: -150 })).toBe(-1000)
    })
  })
})
