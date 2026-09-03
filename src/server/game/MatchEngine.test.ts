import { describe, expect, it } from 'vitest'
import { ClockManager, MatchEngine } from './MatchEngine'

describe('MatchEngine', () => {
  describe('match creation', () => {
    it('should create a match with two players', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      })
      
      expect(match.id).toBeDefined()
      expect(match.playerAId).toBeDefined()
      expect(match.playerBId).toBeDefined()
      expect(match.status).toBe('active')
      expect(match.games).toHaveLength(4)
    })

    it('should assign colors correctly across 4 games', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
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

  describe('getMatchMetrics', () => {
    it('should flag a hanging-queen recapture as a blunder (ADR-017)', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      })

      const matchId = match.id,
       gameId = match.games[0].id,
       whiteId = match.playerAId,
       blackId = match.playerBId

      // 1. e4 e5 2. Qh5 g6 3. Qxg6?? fxg6 — white drops the queen
      engine.makeMove(matchId, gameId, whiteId, 'e4')
      engine.makeMove(matchId, gameId, blackId, 'e5')
      engine.makeMove(matchId, gameId, whiteId, 'Qh5')
      engine.makeMove(matchId, gameId, blackId, 'g6')
      const queenTake = engine.makeMove(matchId, gameId, whiteId, 'Qxg6')
      expect(queenTake.accepted).toBe(true)
      const pawnRecapture = engine.makeMove(matchId, gameId, blackId, 'fxg6')
      expect(pawnRecapture.accepted).toBe(true)

      const metrics = engine.getMatchMetrics(matchId)
      expect(metrics).not.toBeNull()
      expect(metrics!.blunderRate).toBeGreaterThan(0)
      // The blunder happened in a position where a capture was available
      expect(metrics!.tacticalAccuracy).toBeLessThan(1)
    })
  })

  describe('game flow', () => {
    it('should allow making moves', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       result = engine.makeMove(match.id, gameId, match.playerAId, 'e4')
      
      expect(result.accepted).toBe(true)
      expect(result.move).toBe('e4')
      expect(result.nextTurn).toBe('black')
    })

    it('should reject moves from wrong player', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       result = engine.makeMove(match.id, gameId, match.playerBId, 'e5')
      
      expect(result.accepted).toBe(false)
      expect(result.error).toBe('NOT_YOUR_TURN')
    })

    it('should reject illegal moves', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       result = engine.makeMove(match.id, gameId, match.playerAId, 'e5')
      
      expect(result.accepted).toBe(false)
      expect(result.error).toBe('ILLEGAL_MOVE')
    })

    it('should complete game with checkmate', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       whiteId = match.playerAId,
       blackId = match.playerBId
      
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
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       state = engine.getGameState(match.id, gameId)
      
      expect(state.fen).toBeDefined()
      expect(state.turn).toBe('white')
      expect(state.legalMoves).toBeDefined()
      expect(state.legalMoves!.length).toBe(20)
    })

    it('should include legal moves in assisted mode', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       state = engine.getGameState(match.id, gameId)
      
      expect(state.legalMoves).toBeDefined()
      expect(state.legalMoves).toContain('e4')
      expect(state.legalMoves).toContain('d4')
    })
  })

  describe('message sending', () => {
    it('should allow sending messages', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       result = engine.sendMessage(match.id, gameId, match.playerAId, 'Good luck!')
      
      expect(result.sent).toBe(true)
      expect(result.messageId).toBeDefined()
    })

    it('should retrieve opponent messages', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id
      engine.sendMessage(match.id, gameId, match.playerAId, 'Hello!')
      
      const messages = engine.getMessages(match.id, gameId, match.playerBId)
      
      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Hello!')
      expect(messages[0].sender).toBe('opponent')
    })
  })

  describe('draw offers', () => {
    it('should allow offering a draw', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       result = engine.offerDraw(match.id, gameId, match.playerAId)
      
      expect(result.sent).toBe(true)
    })

    it('should allow accepting a draw', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id
      engine.offerDraw(match.id, gameId, match.playerAId)
      const result = engine.acceptDraw(match.id, gameId, match.playerBId)
      
      expect(result.accepted).toBe(true)
    })
  })

  describe('resignation', () => {
    it('should allow resigning', () => {
      const engine = new MatchEngine(),
       match = engine.createMatch({
        boardMode: 'assisted',
        playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
        playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
        startingPosition: 'standard',
        timeControl: '10+5',
      }),
      
       gameId = match.games[0].id,
       result = engine.resign(match.id, gameId, match.playerAId)
      
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
    clock['turnStartTime'] = start - 10_000 // 10 seconds ago
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

  it('should report turn elapsed time while running', () => {
    const clock = new ClockManager('10+5')
    expect(clock.getTurnElapsedSeconds('white')).toBe(0)
    clock.startTurn('white')
    clock['turnStartTime'] = Date.now() - 12_000 // 12 seconds ago
    expect(clock.getTurnElapsedSeconds('white')).toBeGreaterThanOrEqual(11)
    expect(clock.getTurnElapsedSeconds('black')).toBe(0)
    clock.endTurn('white')
    expect(clock.getTurnElapsedSeconds('white')).toBe(0)
  })
})

describe('per-move metrics', () => {
  function setupMatch() {
    const engine = new MatchEngine(),
     match = engine.createMatch({
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
      startingPosition: 'standard',
      timeControl: '10+5',
    })
    return { blackId: match.playerBId, engine, gameId: match.games[0].id, match, whiteId: match.playerAId }
  }

  it('should enrich move events with think time, tokens, clocks and move number', () => {
    const { engine, match, gameId, whiteId } = setupMatch()

    engine.trackTokens(match.id, gameId, whiteId, 150)
    engine.startPlayerTurn(match.id, gameId, whiteId)
    const game = match.games[0]
    game.clock['turnStartTime'] = Date.now() - 10_000 // 10 seconds ago

    const result = engine.makeMove(match.id, gameId, whiteId, 'e4')
    expect(result.accepted).toBe(true)

    const moveEvent = engine.getEvents(match.id).find(e => e.eventType === 'move')
    expect(moveEvent).toBeDefined()
    expect(moveEvent!.data.thinkTimeSeconds).toBeGreaterThanOrEqual(9)
    expect(moveEvent!.data.tokensUsed).toBe(150)
    expect(moveEvent!.data.apiCalls).toBeGreaterThanOrEqual(1)
    expect(moveEvent!.data.moveNumber).toBe(1)
    expect(moveEvent!.gameMove).toBe(1)
    expect(moveEvent!.clockWhite).toEqual(expect.any(Number))
    expect(moveEvent!.clockBlack).toEqual(expect.any(Number))
  })

  it('should flag captures and checks on move events', () => {
    const { engine, match, gameId, whiteId, blackId } = setupMatch()

    engine.makeMove(match.id, gameId, whiteId, 'e4')
    engine.makeMove(match.id, gameId, blackId, 'd5')
    const capture = engine.makeMove(match.id, gameId, whiteId, 'exd5')
    expect(capture.accepted).toBe(true)

    const events = engine.getEvents(match.id).filter(e => e.eventType === 'move')
    const captureEvent = events[events.length - 1]
    expect(captureEvent.data.isCapture).toBe(true)
    expect(captureEvent.data.captured).toBe('p')

    const metrics = engine.getMatchMetrics(match.id)
    expect(metrics!.totalCaptures).toBe(1)
  })

  it('should log illegal_move events for rejected moves', () => {
    const { engine, match, gameId, whiteId } = setupMatch()

    const result = engine.makeMove(match.id, gameId, whiteId, 'e5')
    expect(result.accepted).toBe(false)

    const illegal = engine.getEvents(match.id).filter(e => e.eventType === 'illegal_move')
    expect(illegal).toHaveLength(1)
    expect(illegal[0].data.move).toBe('e5')
    expect(illegal[0].gameMove).toBe(1)

    const metrics = engine.getMatchMetrics(match.id)
    expect(metrics!.totalIllegalMoves).toBe(1)
    expect(metrics!.illegalMoveRate).toBeGreaterThan(0)
  })

  it('should aggregate think time and token metrics', () => {
    const { engine, match, gameId, whiteId, blackId } = setupMatch()

    engine.trackTokens(match.id, gameId, whiteId, 100)
    engine.makeMove(match.id, gameId, whiteId, 'e4')
    engine.trackTokens(match.id, gameId, blackId, 200)
    engine.makeMove(match.id, gameId, blackId, 'e5')

    const metrics = engine.getMatchMetrics(match.id)
    expect(metrics!.totalMoves).toBe(2)
    expect(metrics!.totalTokensUsed).toBe(300)
    expect(metrics!.avgTokensPerMove).toBe(150)
    expect(metrics!.avgThinkTimeSeconds).toBeGreaterThanOrEqual(0)
    expect(metrics!.maxThinkTimeSeconds).toBeGreaterThanOrEqual(0)
    expect(metrics!.totalChecks).toBe(0)
    expect(metrics!.totalPromotions).toBe(0)
    expect(metrics!.totalCastles).toBe(0)
  })
})

describe('listMatches', () => {
  function newMatch(engine: MatchEngine, extra: Partial<{ isPrivate: boolean; name: string }> = {}) {
    return engine.createMatch({
      boardMode: 'assisted',
      isPrivate: extra.isPrivate,
      playerAModel: { maxOutputTokens: 4096, name: extra.name ?? 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: '1.0' },
      startingPosition: 'standard',
      timeControl: '10+5',
    })
  }

  it('returns public matches newest-first and hides private ones', async () => {
    const engine = new MatchEngine()
    const first = newMatch(engine)
    // Stagger createdAt so the order is deterministic (1ms resolution on Date.now)
    await new Promise((r) => setTimeout(r, 15))
    const second = newMatch(engine, { name: 'gemini-1.5-pro' })
    await new Promise((r) => setTimeout(r, 15))
    newMatch(engine, { isPrivate: true })

    const list = engine.listMatches()
    expect(list.map((m) => m.id)).toEqual([second.id, first.id])
    expect(list.every((m) => !m.isPrivate)).toBe(true)
  })
})
