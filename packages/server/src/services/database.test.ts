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
