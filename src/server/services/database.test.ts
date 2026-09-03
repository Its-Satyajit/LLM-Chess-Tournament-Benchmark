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
    await new Promise((r) => setTimeout(r, 15))
    const second = engine.createMatch(config('gemini-1.5-pro'))
    await db.saveMatch(second)
    await new Promise((r) => setTimeout(r, 15))
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

  it('should save and load ratings', async () => {
    await db.saveRating('gpt-4o', 'openai', {
      gamesPlayed: 10,
      rating: 1600,
      rd: 50,
      volatility: 0.06,
    })

    const ratings = await db.loadRatings()
    expect(ratings.length).toBe(1)
    expect(ratings[0].modelName).toBe('gpt-4o')
    expect(ratings[0].rating).toBe(1600)
  })
})
