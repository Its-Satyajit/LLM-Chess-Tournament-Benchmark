import { describe, it, expect } from 'vitest'
import { MatchEngine } from './MatchEngine'
import { LIMITS } from '@llm-chess-arena/shared'

function createTestMatch(engine: MatchEngine) {
  return engine.createMatch({
    playerAModel: { name: 'gpt-4o', provider: 'openai', version: 'latest', temperature: 0.7, maxOutputTokens: 4096 },
    playerBModel: { name: 'claude', provider: 'anthropic', version: 'latest', temperature: 0.7, maxOutputTokens: 4096 },
    timeControl: '10+5',
    startingPosition: 'standard',
    boardMode: 'assisted',
  })
}

describe('Budget Tracking', () => {
  describe('API call limits', () => {
    it('tracks API calls per turn', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      engine.trackApiCall(match.id, game.id, match.playerAId)
      engine.trackApiCall(match.id, game.id, match.playerAId)

      const budget = engine.getBudget(match.id, game.id)
      expect(budget?.white.apiCallsTurn).toBe(2)
      expect(budget?.white.apiCallsGame).toBe(2)
    })

    it('tracks API calls per game', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      for (let i = 0; i < 5; i++) {
        engine.trackApiCall(match.id, game.id, match.playerAId)
      }

      const budget = engine.getBudget(match.id, game.id)
      expect(budget?.white.apiCallsGame).toBe(5)
    })

    it('keeps counting (advisory) far beyond the per-turn limit without blocking', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      // Far exceed the (now advisory) per-turn budget
      for (let i = 0; i < LIMITS.MAX_API_CALLS_PER_TURN + 50; i++) {
        engine.trackApiCall(match.id, game.id, match.playerAId)
      }

      const result = engine.trackApiCall(match.id, game.id, match.playerAId)
      expect(result).toBe(true)

      const budget = engine.getBudget(match.id, game.id)
      expect(budget?.white.apiCallsTurn).toBe(LIMITS.MAX_API_CALLS_PER_TURN + 51)
    })

    it('keeps counting (advisory) far beyond the per-game limit without blocking or forfeiting', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      // Far exceed the (now advisory) per-game budget
      for (let i = 0; i < LIMITS.MAX_API_CALLS_PER_GAME + 50; i++) {
        engine.resetTurnBudget(game.id, 'white')
        engine.trackApiCall(match.id, game.id, match.playerAId)
      }

      engine.resetTurnBudget(game.id, 'white')
      const result = engine.trackApiCall(match.id, game.id, match.playerAId)
      expect(result).toBe(true)

      // Game remains active and not completed
      expect(game.status).toBe('active')
      expect(game.result).toBeNull()
    })

    it('accepts makeMove even when the (advisory) game API limit is far exceeded', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      for (let i = 0; i < LIMITS.MAX_API_CALLS_PER_GAME + 50; i++) {
        engine.resetTurnBudget(game.id, 'white')
        engine.trackApiCall(match.id, game.id, match.playerAId)
      }

      engine.resetTurnBudget(game.id, 'white')
      const moveResult = engine.makeMove(match.id, game.id, match.playerAId, 'e4')
      expect(moveResult.accepted).toBe(true)
    })

    it('resets turn budget correctly', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      engine.trackApiCall(match.id, game.id, match.playerAId)
      engine.trackApiCall(match.id, game.id, match.playerAId)
      engine.resetTurnBudget(game.id, 'white')

      const budget = engine.getBudget(match.id, game.id)
      expect(budget?.white.apiCallsTurn).toBe(0)
      expect(budget?.white.apiCallsGame).toBe(2) // Game total persists
    })
  })

  describe('Token limits', () => {
    it('tracks tokens per move', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      engine.trackTokens(match.id, game.id, match.playerAId, 100)

      const budget = engine.getBudget(match.id, game.id)
      expect(budget?.white.tokensMove).toBe(100)
      expect(budget?.white.tokensGame).toBe(100)
    })

    it('returns false when per-move limit exceeded', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      engine.trackTokens(match.id, game.id, match.playerAId, LIMITS.MAX_TOKENS_PER_MOVE)
      const result = engine.trackTokens(match.id, game.id, match.playerAId, 1)
      expect(result).toBe(false)
    })

    it('returns false when per-game limit exceeded and forfeits', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      // Fill up game token budget
      engine.trackTokens(match.id, game.id, match.playerAId, LIMITS.MAX_TOKENS_PER_GAME - 100)
      engine.resetTurnBudget(game.id, 'white')
      engine.trackTokens(match.id, game.id, match.playerAId, 100)

      // Now at limit — next token tracking should forfeit
      engine.resetTurnBudget(game.id, 'white')
      const result = engine.trackTokens(match.id, game.id, match.playerAId, 1)
      expect(result).toBe(false)

      // Game should be completed (check the original game)
      expect(game.status).toBe('completed')
      expect(game.result?.reason).toBe('token_limit')
    })
  })

  describe('Budget for both players', () => {
    it('tracks black player independently', () => {
      const engine = new MatchEngine()
      const match = createTestMatch(engine)
      const game = match.games[0]

      engine.trackApiCall(match.id, game.id, match.playerAId)
      engine.trackApiCall(match.id, game.id, match.playerAId)
      engine.trackApiCall(match.id, game.id, match.playerBId)

      const budget = engine.getBudget(match.id, game.id)
      expect(budget?.white.apiCallsGame).toBe(2)
      expect(budget?.black.apiCallsGame).toBe(1)
    })

    it('returns null for nonexistent game', () => {
      const engine = new MatchEngine()
      expect(engine.getBudget('fake', 'fake')).toBeNull()
    })
  })
})
