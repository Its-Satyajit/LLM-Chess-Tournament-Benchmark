import { describe, it, expect, beforeEach } from 'vitest'
import { DatabaseService } from './database'
import { MatchEngine, MatchConfig } from '../game/MatchEngine'

describe('DatabaseService', () => {
  let db: DatabaseService
  let engine: MatchEngine

  beforeEach(async () => {
    db = new DatabaseService()
    engine = db.getEngine()
    await db.clearAll()
  })

  it('should create a match and save to database', async () => {
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }

    // Create match in engine
    const match = engine.createMatch(config)

    // Save to database
    await db.saveMatch(match)

    // Load from database
    await db.loadMatches()

    // Verify match exists in engine
    const loadedMatch = engine.getMatch(match.id)
    expect(loadedMatch).toBeDefined()
    expect(loadedMatch?.id).toBe(match.id)
    expect(loadedMatch?.playerAId).toBe(match.playerAId)
    expect(loadedMatch?.playerBId).toBe(match.playerBId)
    expect(loadedMatch?.status).toBe('active')
  })

  it('should persist game state across saves', async () => {
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }

    const match = engine.createMatch(config)
    await db.saveMatch(match)

    // Make a move
    const game = match.games[0]
    const result = engine.makeMove(match.id, game.id, match.playerAId, 'e4')
    expect(result.accepted).toBe(true)

    // Save updated state
    await db.saveGame(game)

    // Load and verify
    await db.loadMatches()
    const loadedMatch = engine.getMatch(match.id)
    expect(loadedMatch).toBeDefined()
    expect(loadedMatch?.games[0].moveCount).toBe(1)
  })

  it('should save and load events', async () => {
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }

    const match = engine.createMatch(config)
    await db.saveMatch(match)

    // Make a move to generate event
    const game = match.games[0]
    engine.makeMove(match.id, game.id, match.playerAId, 'e4')

    // Get events from engine
    const events = engine.getEvents(match.id)
    expect(events.length).toBeGreaterThan(0)

    // Save events to database
    for (const event of events) {
      await db.saveEvent(event)
    }

    // Verify events exist in database
    const loadedEvents = engine.getEvents(match.id)
    expect(loadedEvents.length).toBe(events.length)
  })

  it('should persist per-move context columns (game_move, clocks)', async () => {
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }

    const match = engine.createMatch(config)
    await db.saveMatch(match)

    const game = match.games[0]
    engine.makeMove(match.id, game.id, match.playerAId, 'e4')
    await db.saveMatch(match)
    await db.saveNewEvents(match.id)

    // Reload persisted state and verify the move event round-trips its context
    await db.loadMatches()
    const moveEvents = engine.getEvents(match.id).filter(e => e.eventType === 'move' && e.gameMove === 1)
    expect(moveEvents.length).toBeGreaterThan(0)
    const persisted = moveEvents[moveEvents.length - 1]
    expect(persisted.data.move).toBe('e4')
    expect(persisted.data.thinkTimeSeconds).toEqual(expect.any(Number))
    expect(persisted.clockWhite).toEqual(expect.any(Number))
    expect(persisted.clockBlack).toEqual(expect.any(Number))
  })

  it('listMatchesWithGames returns persisted matches newest-first and skips private ones', async () => {
    const config = (name: string): MatchConfig => ({
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name, provider: 'openai', temperature: 0.7, version: 'latest' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    })

    const first = engine.createMatch(config('gpt-4o'))
    await db.saveMatch(first)
    await new Promise((resolve) => setTimeout(resolve, 15))
    const second = engine.createMatch(config('gemini-1.5-pro'))
    await db.saveMatch(second)
    await new Promise((resolve) => setTimeout(resolve, 15))
    const privateMatch = engine.createMatch({ ...config('private-model'), isPrivate: true })
    await db.saveMatch(privateMatch)

    const list = await db.listMatchesWithGames()
    // Newest-first; private row must be excluded.
    expect(list.map((r) => r.match.id)).toEqual([second.id, first.id])
    expect(list.every((r) => r.match.status === 'active')).toBe(true)
    for (const r of list) {
      expect(r.games.length).toBe(4)
      expect(r.match.playerAModel.name).toBeDefined()
      expect(r.match.playerAModel.provider).toBe('openai')
    }
  })

  it('should save and load game reviews', async () => {
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }
    const match = engine.createMatch(config)
    await db.saveMatch(match)
    const game = match.games[0]

    const reviewPayload = {
      blackAccuracy: 88.5,
      blackRating: 1950,
      classificationCounts: {
        black: { best: 10, blunder: 1, brilliant: 1, excellent: 5, good: 3, inaccuracy: 2, miss: 0, mistake: 1 },
        white: { best: 12, blunder: 0, brilliant: 2, excellent: 4, good: 2, inaccuracy: 1, miss: 0, mistake: 0 },
      },
      depth: 16,
      gameId: game.id,
      id: `rev-${game.id}`,
      matchId: match.id,
      plies: [
        { centipawns: 20, classification: 'best', move: 'e4', ply: 1, winProbability: 51 },
        { centipawns: 15, classification: 'best', move: 'e5', ply: 2, winProbability: 50 },
      ],
      whiteAccuracy: 94.2,
      whiteRating: 2100,
    }

    await db.saveGameReview(reviewPayload)
    const retrieved = await db.getGameReview(game.id)
    expect(retrieved).toBeDefined()
    expect(retrieved?.gameId).toBe(game.id)
    expect(retrieved?.whiteAccuracy).toBe(94.2)
    expect(retrieved?.blackAccuracy).toBe(88.5)
    expect(retrieved?.classificationCounts.white.brilliant).toBe(2)
  })

  it('getBenchmarkMetrics aggregates models across ratings and matches', async () => {
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-3-5-sonnet', provider: 'anthropic', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }
    const match = engine.createMatch(config)
    await db.saveMatch(match)
    await db.saveRating('gpt-4o', 'openai', { gamesPlayed: 4, rating: 1680, rd: 45, volatility: 0.06 })
    await db.saveRating('claude-3-5-sonnet', 'anthropic', { gamesPlayed: 4, rating: 1620, rd: 50, volatility: 0.06 })

    const metrics = await db.getBenchmarkMetrics()
    expect(metrics).toBeDefined()
    expect(Array.isArray(metrics.models)).toBe(true)
    const gpt = metrics.models.find(m => m.model === 'gpt-4o')
    expect(gpt).toBeDefined()
    expect(gpt?.provider).toBe('openai')
    expect(gpt?.rating).toBe(1680)
  })

  it('deleting a model removes it from active models while preserving match history and ratings', async () => {
    // 1. Add model to available models roster
    const customModel = {
      config: { maxOutputTokens: 2048, name: 'temp-experimental-ai', provider: 'experimental', temperature: 0.5, version: '1.0' },
      id: 'MODEL-temp-exp',
      name: 'temp-experimental-ai',
      provider: 'experimental',
    }
    await db.addModel(customModel)
    const modelsBefore = await db.loadModels()
    expect(modelsBefore.some(m => m.id === 'MODEL-temp-exp')).toBe(true)

    // 2. Create and save an active match featuring this model
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: customModel.config,
      playerBModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }
    const match = engine.createMatch(config)
    await db.saveMatch(match)
    await db.saveRating('temp-experimental-ai', 'experimental', { gamesPlayed: 1, rating: 1550, rd: 100, volatility: 0.06 })

    // 3. Delete the model from models roster
    await db.deleteModel('MODEL-temp-exp')

    // 4. Verify model is removed from available models roster
    const modelsAfter = await db.loadModels()
    expect(modelsAfter.some(m => m.id === 'MODEL-temp-exp')).toBe(false)

    // 5. Verify match history, ratings, and benchmark stats are preserved as immutable records
    const matches = await db.listMatchesWithGames()
    const foundMatch = matches.find((m) => m.match.id === match.id)
    expect(foundMatch).toBeDefined()
    expect(foundMatch?.match.playerAModel.name).toBe('temp-experimental-ai')

    const ratings = await db.loadRatings()
    const foundRating = ratings.find(r => r.modelName === 'temp-experimental-ai')
    expect(foundRating).toBeDefined()
    expect(foundRating?.rating).toBe(1550)

    const benchmark = await db.getBenchmarkMetrics()
    expect(benchmark.models.some(m => m.model === 'temp-experimental-ai')).toBe(true)
  })

  it('ensureMatchLoaded lazily recovers a persisted match into a fresh (cold-start) engine', async () => {
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-sonnet-4-20250514', provider: 'anthropic', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }

    // Match created, played, and persisted by one instance's engine
    const match = engine.createMatch(config)
    const game = match.games[0]
    engine.makeMove(match.id, game.id, match.playerAId, 'e4')
    await db.saveMatch(match)
    await db.saveNewEvents(match.id)

    // A brand-new instance with an empty in-memory engine (serverless cold start)
    const freshDb = new DatabaseService()
    const freshEngine = freshDb.getEngine()
    expect(freshEngine.getMatch(match.id)).toBeUndefined()

    // On-demand load recovers the match from SQLite and reconstructs board state
    const loaded = await freshDb.ensureMatchLoaded(match.id)
    expect(loaded?.id).toBe(match.id)
    expect(freshEngine.getMatch(match.id)).toBeDefined()
    expect(freshEngine.getMatch(match.id)?.games[0].moveCount).toBe(1)

    // Board state is rebuilt from persisted move events: black to move after 1.e4
    const state = freshEngine.getGameState(match.id, game.id)
    expect(state.turn).toBe('black')
    expect(state.history).toContain('e4')
    expect(state.legalMoves).toContain('e5')

    // Idempotent: a second load returns the already-loaded match without reloading
    const again = await freshDb.ensureMatchLoaded(match.id)
    expect(again?.id).toBe(match.id)
    expect(freshEngine.getEvents(match.id).filter(e => e.eventType === 'move').length).toBe(1)
  })
})
