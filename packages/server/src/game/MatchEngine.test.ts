import { describe, it, expect, beforeEach } from 'vitest'
import { MatchEngine, ClockManager } from './MatchEngine'

describe('MatchEngine', () => {
  describe('match creation', () => {
    it('should create a match with two players', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      expect(match.id).toBeDefined()
      expect(match.playerAId).toBeDefined()
      expect(match.playerBId).toBeDefined()
      expect(match.status).toBe('active')
      expect(match.games).toHaveLength(4)
    })

    it('should assign colors correctly across 4 games', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      // Game 1: A white, standard
      // Game 2: B white, standard
      // Game 3: A white, chess960
      // Game 4: B white, chess960
      expect(match.games[0].whitePlayerId).toBe(match.playerAId)
      expect(match.games[1].whitePlayerId).toBe(match.playerBId)
      expect(match.games[2].whitePlayerId).toBe(match.playerAId)
      expect(match.games[3].whitePlayerId).toBe(match.playerBId)
    })
  })

  describe('game flow', () => {
    it('should allow making moves', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const result = engine.makeMove(match.id, gameId, match.playerAId, 'e4')
      
      expect(result.accepted).toBe(true)
      expect(result.move).toBe('e4')
      expect(result.nextTurn).toBe('black')
    })

    it('should reject moves from wrong player', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const result = engine.makeMove(match.id, gameId, match.playerBId, 'e5')
      
      expect(result.accepted).toBe(false)
      expect(result.error).toBe('NOT_YOUR_TURN')
    })

    it('should reject illegal moves', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const result = engine.makeMove(match.id, gameId, match.playerAId, 'e5')
      
      expect(result.accepted).toBe(false)
      expect(result.error).toBe('ILLEGAL_MOVE')
    })

    it('should complete game with checkmate', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const whiteId = match.playerAId
      const blackId = match.playerBId
      
      // Scholar's mate
      engine.makeMove(match.id, gameId, whiteId, 'e4')
      engine.makeMove(match.id, gameId, blackId, 'e5')
      engine.makeMove(match.id, gameId, whiteId, 'Bc4')
      engine.makeMove(match.id, gameId, blackId, 'Nc6')
      engine.makeMove(match.id, gameId, whiteId, 'Qh5')
      engine.makeMove(match.id, gameId, blackId, 'Nf6')
      const result = engine.makeMove(match.id, gameId, whiteId, 'Qxf7')
      
      expect(result.isGameOver).toBe(true)
      expect(result.result?.winner).toBe('white')
      expect(result.result?.reason).toBe('checkmate')
    })
  })

  describe('getGameState', () => {
    it('should return current game state', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const state = engine.getGameState(match.id, gameId)
      
      expect(state.fen).toBeDefined()
      expect(state.turn).toBe('white')
      expect(state.legalMoves).toBeDefined()
      expect(state.legalMoves!.length).toBe(20)
    })

    it('should include legal moves in assisted mode', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const state = engine.getGameState(match.id, gameId)
      
      expect(state.legalMoves).toBeDefined()
      expect(state.legalMoves).toContain('e4')
      expect(state.legalMoves).toContain('d4')
    })
  })

  describe('message sending', () => {
    it('should allow sending messages', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const result = engine.sendMessage(match.id, gameId, match.playerAId, 'Good luck!')
      
      expect(result.sent).toBe(true)
      expect(result.messageId).toBeDefined()
    })

    it('should retrieve opponent messages', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      engine.sendMessage(match.id, gameId, match.playerAId, 'Hello!')
      
      const messages = engine.getMessages(match.id, gameId, match.playerBId)
      
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Hello!')
      expect(messages[0].sender).toBe('opponent')
    })
  })

  describe('draw offers', () => {
    it('should allow offering a draw', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const result = engine.offerDraw(match.id, gameId, match.playerAId)
      
      expect(result.sent).toBe(true)
    })

    it('should allow accepting a draw', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      engine.offerDraw(match.id, gameId, match.playerAId)
      const result = engine.acceptDraw(match.id, gameId, match.playerBId)
      
      expect(result.accepted).toBe(true)
    })
  })

  describe('resignation', () => {
    it('should allow resigning', () => {
      const engine = new MatchEngine()
      const match = engine.createMatch({
        playerAModel: { provider: 'openai', name: 'gpt-4o', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        playerBModel: { provider: 'anthropic', name: 'claude-sonnet-4-20250514', version: '1.0', temperature: 0.7, maxOutputTokens: 4096 },
        timeControl: '10+5',
        startingPosition: 'standard',
        boardMode: 'assisted',
      })
      
      const gameId = match.games[0].id
      const result = engine.resign(match.id, gameId, match.playerAId)
      
      expect(result.resigned).toBe(true)
    })
  })
})

describe('ClockManager', () => {
  it('should initialize with correct time', () => {
    const clock = new ClockManager('10+5')
    expect(clock.getWhiteTime()).toBe(600)
    expect(clock.getBlackTime()).toBe(600)
  })

  it('should decrement time', () => {
    const clock = new ClockManager('10+5')
    clock.startTurn('white')
    // Simulate some time passing
    const start = Date.now()
    clock['turnStartTime'] = start - 10000 // 10 seconds ago
    clock.endTurn('white')
    // Should be 600 - 10 + 5 = 595
    expect(clock.getWhiteTime()).toBe(595)
  })

  it('should add increment after move', () => {
    const clock = new ClockManager('10+5')
    clock.startTurn('white')
    clock.endTurn('white')
    // Should be ~600 - elapsed + 5
    expect(clock.getWhiteTime()).toBeGreaterThan(590)
  })
})
