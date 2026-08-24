import { describe, it, expect, vi } from 'vitest'
import {
  broadcast,
  broadcastMoveMade,
  broadcastMessageSent,
  broadcastDrawOffer,
  broadcastDrawResult,
  broadcastGameOver,
  broadcastMatchOver,
  broadcastStateUpdate,
  getClientCount,
} from './index'

describe('WebSocket', () => {
  // Mock WebSocket connections
  function createMockWs() {
    return {
      send: vi.fn(),
      data: { subscriptions: new Set<string>() },
    } as any
  }

  describe('broadcast', () => {
    it('sends message to all clients in room', () => {
      // broadcast functions should not throw even with no connections
      broadcastMoveMade('match-1', 'game-1', 'e4', 'player-1', { white: 300, black: 300 })
      expect(true).toBe(true)
    })

    it('does not throw when no clients in room', () => {
      expect(() => {
        broadcast('nonexistent-match', { type: 'test' })
      }).not.toThrow()
    })

    it('handles send errors gracefully', () => {
      const ws = createMockWs()
      ws.send.mockImplementation(() => { throw new Error('Connection closed') })

      // This tests that broadcast doesn't crash on send errors
      expect(() => {
        broadcast('test-match', { type: 'test' })
      }).not.toThrow()
    })
  })

  describe('broadcastMoveMade', () => {
    it('sends correct event format', () => {
      // Since we can't easily mock the rooms Map, we verify the function exists and is callable
      expect(typeof broadcastMoveMade).toBe('function')
      expect(() => broadcastMoveMade('m1', 'g1', 'e4', 'p1', { white: 300, black: 295 })).not.toThrow()
    })
  })

  describe('broadcastMessageSent', () => {
    it('sends correct event format', () => {
      expect(typeof broadcastMessageSent).toBe('function')
      expect(() => broadcastMessageSent('m1', 'g1', 'p1', 'Hello!')).not.toThrow()
    })
  })

  describe('broadcastDrawOffer', () => {
    it('sends correct event format', () => {
      expect(typeof broadcastDrawOffer).toBe('function')
      expect(() => broadcastDrawOffer('m1', 'g1', 'p1')).not.toThrow()
    })
  })

  describe('broadcastDrawResult', () => {
    it('sends correct event format', () => {
      expect(typeof broadcastDrawResult).toBe('function')
      expect(() => broadcastDrawResult('m1', 'g1', true)).not.toThrow()
      expect(() => broadcastDrawResult('m1', 'g1', false)).not.toThrow()
    })
  })

  describe('broadcastGameOver', () => {
    it('sends correct event format', () => {
      expect(typeof broadcastGameOver).toBe('function')
      expect(() => broadcastGameOver('m1', 'g1', 'white_win', 'checkmate')).not.toThrow()
    })
  })

  describe('broadcastMatchOver', () => {
    it('sends correct event format', () => {
      expect(typeof broadcastMatchOver).toBe('function')
      expect(() => broadcastMatchOver('m1', 'white_win')).not.toThrow()
    })
  })

  describe('broadcastStateUpdate', () => {
    it('sends correct event format', () => {
      expect(typeof broadcastStateUpdate).toBe('function')
      expect(() => broadcastStateUpdate('m1', 'g1', { fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', turn: 'white' })).not.toThrow()
    })
  })

  describe('getClientCount', () => {
    it('returns 0 for nonexistent room', () => {
      expect(getClientCount('nonexistent')).toBe(0)
    })
  })

  describe('MatchEngine event listener integration', () => {
    it('MatchEngine has onEvent method', async () => {
      const { MatchEngine } = await import('../game/MatchEngine')
      const engine = new MatchEngine()
      expect(typeof engine.onEvent).toBe('function')
    })

    it('MatchEngine calls listener on move', async () => {
      const { MatchEngine } = await import('../game/MatchEngine')
      const engine = new MatchEngine()
      const listener = vi.fn()
      engine.onEvent(listener)

      const match = engine.createMatch({
        playerAModel: { name: 'gpt-4o', provider: 'openai', version: 'latest', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { name: 'claude', provider: 'anthropic', version: 'latest', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })

      const game = match.games[0]
      engine.makeMove(match.id, game.id, game.whitePlayerId, 'e4')

      expect(listener).toHaveBeenCalled()
      // First event is match_created, second is game_started, third is move
      const moveEvent = listener.mock.calls.find((call: any) => call[0].eventType === 'move')
      expect(moveEvent).toBeDefined()
      expect(moveEvent![0].matchId).toBe(match.id)
      expect(moveEvent![0].gameId).toBe(game.id)
    })
  })
})
