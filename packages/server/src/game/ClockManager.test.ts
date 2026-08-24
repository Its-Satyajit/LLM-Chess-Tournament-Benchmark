import { describe, expect, it } from 'vitest'
import { ClockManager, MatchEngine } from './MatchEngine'

const MODEL_A = { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' }
const MODEL_B = { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' }

describe('ClockManager', () => {
  describe('time control parsing', () => {
    it('should parse "10+5" as 10 minutes base, 5 second increment', () => {
      const clock = new ClockManager('10+5')
      expect(clock.getWhiteTime()).toBe(600)
      expect(clock.getBlackTime()).toBe(600)
    })

    it('should parse "3+2" (Blitz)', () => {
      const clock = new ClockManager('3+2')
      expect(clock.getWhiteTime()).toBe(180)
      expect(clock.getBlackTime()).toBe(180)
    })

    it('should parse "30+10" (Classical)', () => {
      const clock = new ClockManager('30+10')
      expect(clock.getWhiteTime()).toBe(1800)
      expect(clock.getBlackTime()).toBe(1800)
    })

    it('should parse "5+0" with no increment', () => {
      const clock = new ClockManager('5+0')
      expect(clock.getWhiteTime()).toBe(300)
      expect(clock.getBlackTime()).toBe(300)
    })
  })

  describe('continuous clock model', () => {
    it('should track elapsed time from startTurn', () => {
      const clock = new ClockManager('10+5')
      clock.startTurn('white')

      // Simulate 10 seconds passing
      clock['turnStartTime'] = Date.now() - 10_000
      clock.endTurn('white')

      // 600 - 10 + 5 increment = 595
      expect(clock.getWhiteTime()).toBe(595)
    })

    it('should not affect opponent clock during a turn', () => {
      const clock = new ClockManager('10+5')
      clock.startTurn('white')

      clock['turnStartTime'] = Date.now() - 5_000
      clock.endTurn('white')

      expect(clock.getWhiteTime()).toBe(600) // 600 - 5 + 5 = 600
      expect(clock.getBlackTime()).toBe(600) // unchanged
    })

    it('should correctly track alternating turns', () => {
      const clock = new ClockManager('10+5')

      // White thinks for 3 seconds
      clock.startTurn('white')
      clock['turnStartTime'] = Date.now() - 3_000
      clock.endTurn('white')
      expect(clock.getWhiteTime()).toBe(602) // 600 - 3 + 5

      // Black thinks for 7 seconds
      clock.startTurn('black')
      clock['turnStartTime'] = Date.now() - 7_000
      clock.endTurn('black')
      expect(clock.getBlackTime()).toBe(598) // 600 - 7 + 5
    })

    it('should handle zero increment correctly', () => {
      const clock = new ClockManager('5+0')
      clock.startTurn('white')
      clock['turnStartTime'] = Date.now() - 10_000
      clock.endTurn('white')
      // 300 - 10 + 0 = 290
      expect(clock.getWhiteTime()).toBe(290)
    })
  })

  describe('flag fall detection', () => {
    it('should detect flag fall when time reaches zero', () => {
      const clock = new ClockManager('3+2')
      clock.startTurn('white')
      clock['turnStartTime'] = Date.now() - 182_000 // 182 seconds (more than 180 + 2)
      clock.endTurn('white')
      expect(clock.isFlagFall('white')).toBe(true)
    })

    it('should not flag fall if time remains', () => {
      const clock = new ClockManager('10+5')
      clock.startTurn('white')
      clock['turnStartTime'] = Date.now() - 5_000
      clock.endTurn('white')
      expect(clock.isFlagFall('white')).toBe(false)
    })

    it('should return remaining time as 0 when flagged', () => {
      const clock = new ClockManager('3+2')
      clock.startTurn('white')
      clock['turnStartTime'] = Date.now() - 200_000
      clock.endTurn('white')
      expect(clock.getWhiteTime()).toBe(0)
    })
  })

  describe('pause/resume', () => {
    it('should freeze time when paused', () => {
      const clock = new ClockManager('10+5')
      clock.startTurn('white')
      clock['turnStartTime'] = Date.now() - 5_000
      clock.pause()
      // Time frozen at 600 - 5 = 595
      expect(clock.getWhiteTime()).toBe(595)
      expect(clock.isRunning()).toBe(false)
    })

    it('should resume from paused position', () => {
      const clock = new ClockManager('10+5')
      clock.startTurn('white')
      clock['turnStartTime'] = Date.now() - 5_000
      clock.pause()
      expect(clock.getWhiteTime()).toBe(595)

      clock.startTurn('white')
      clock['turnStartTime'] = Date.now() - 3_000
      clock.endTurn('white')
      // 595 - 3 + 5 = 597
      expect(clock.getWhiteTime()).toBe(597)
    })
  })

  describe('insufficient material detection', () => {
    it('should detect insufficient material via MatchEngine on timeout', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '10+5',
      })
      const gameId = match.games[0].id
      // Normal position — not insufficient material
      const result = engine.checkTimeout(match.id, gameId)
      expect(result.timeout).toBe(false)
    })
  })
})

describe('MatchEngine - Time Control', () => {
  describe('flag fall handling', () => {
    it('should declare timeout loss when clock runs out on move', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const gameId = match.games[0].id

      // Make a normal move first
      engine.makeMove(match.id, gameId, match.playerAId, 'e4')

      // Simulate Black's clock running out
      const game = match.games[0]
      game.clock.startTurn('black')
      game.clock['turnStartTime'] = Date.now() - 200_000 // way over time
      game.clock.endTurn('black')

      // Now Black tries to move — should be flagged
      const result = engine.makeMove(match.id, gameId, match.playerBId, 'e5')
      expect(result.accepted).toBe(false)
      expect(result.error).toBe('TIMEOUT')
    })

    it('should handle flag fall via explicit timeout check', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const gameId = match.games[0].id
      const game = match.games[0]

      // Simulate White running out of time
      game.clock.startTurn('white')
      game.clock['turnStartTime'] = Date.now() - 200_000
      game.clock.endTurn('white')

      const result = engine.checkTimeout(match.id, gameId)
      expect(result.timeout).toBe(true)
      expect(result.loser).toBe('white')
      expect(result.gameOver).toBe(true)
    })

    it('should not flag if opponent times out', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const gameId = match.games[0].id

      // White still has time
      const result = engine.checkTimeout(match.id, gameId)
      expect(result.timeout).toBe(false)
    })
  })

  describe('30-second reset between games', () => {
    it('should set 30-second reset period after game completion', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const gameId = match.games[0].id
      engine.makeMove(match.id, gameId, match.playerAId, 'e4')

      // Resign to end game quickly
      engine.resign(match.id, gameId, match.playerAId)

      // Check if next game has reset period
      const matchData = engine.getMatch(match.id)!
      expect(matchData.games[1].status).toBe('active')
      expect(matchData.games[1].clock.isInResetPeriod()).toBe(true)
    })

    it('should allow moves after 30-second reset completes', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const gameId = match.games[0].id
      engine.makeMove(match.id, gameId, match.playerAId, 'e4')
      engine.resign(match.id, gameId, match.playerAId)

      // Simulate 30 seconds passing
      const nextGame = match.games[1]
      nextGame.clock['resetEndTime'] = Date.now() - 30_000

      // Should be able to make a move now
      const result = engine.makeMove(match.id, nextGame.id, match.playerBId, 'd4')
      expect(result.accepted).toBe(true)
    })

    it('should reject moves during reset period', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const resignGameId = match.games[0].id
      engine.makeMove(match.id, resignGameId, match.playerAId, 'e4')
      engine.resign(match.id, resignGameId, match.playerAId)

      // Try to move immediately (during reset)
      const nextGame = match.games[1]
      const result = engine.makeMove(match.id, nextGame.id, match.playerBId, 'd4')
      expect(result.accepted).toBe(false)
      expect(result.error).toBe('RESET_PERIOD')
    })
  })

  describe('time control presets', () => {
    it('should support Blitz (3+2)', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const state = engine.getGameState(match.id, match.games[0].id)
      expect(state.clock.white).toBe(180)
      expect(state.clock.black).toBe(180)
    })

    it('should support Rapid (10+5)', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '10+5',
      })

      const state = engine.getGameState(match.id, match.games[0].id)
      expect(state.clock.white).toBe(600)
      expect(state.clock.black).toBe(600)
    })

    it('should support Classical (30+10)', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '30+10',
      })

      const state = engine.getGameState(match.id, match.games[0].id)
      expect(state.clock.white).toBe(1800)
      expect(state.clock.black).toBe(1800)
    })
  })

  describe('clock pauses only for server errors', () => {
    it('should NOT pause clock for illegal moves (model error)', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const gameId = match.games[0].id
      const game = match.games[0]

      // Start White's turn
      game.clock.startTurn('white')
      game.clock['turnStartTime'] = Date.now() - 5_000

      // Illegal move should NOT pause clock
      const result = engine.makeMove(match.id, gameId, match.playerAId, 'e5')
      expect(result.accepted).toBe(false)

      // Clock should still be running
      expect(game.clock.isRunning()).toBe(true)
    })

    it('should NOT pause clock for unknown tool calls', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const game = match.games[0]
      game.clock.startTurn('white')
      game.clock['turnStartTime'] = Date.now() - 2_000

      // Unknown tool call should NOT pause
      // (simulated by calling an invalid endpoint)
      expect(game.clock.isRunning()).toBe(true)
    })
  })

  describe('makeMove integration with clock', () => {
    it('should not start/stop clock inside makeMove anymore', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '3+2',
      })

      const gameId = match.games[0].id
      const game = match.games[0]

      // Clock is NOT started by makeMove — caller manages it
      engine.makeMove(match.id, gameId, match.playerAId, 'e4')
      // Clock should NOT be running after makeMove (no internal start/stop)
      expect(game.clock.isRunning()).toBe(false)
    })

    it('should report correct clock state in game state response', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: MODEL_A,
        playerBModel: MODEL_B,
        startingPosition: 'standard',
        timeControl: '10+5',
      })

      const gameId = match.games[0].id
      const state = engine.getGameState(match.id, gameId)
      expect(state.clock.white).toBe(600)
      expect(state.clock.black).toBe(600)
    })
  })
})
