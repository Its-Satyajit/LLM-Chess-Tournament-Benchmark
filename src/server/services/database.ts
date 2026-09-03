import { db, initializeDatabase } from '../db'
import { matches, games, events, ratings, messages as messagesTable, models as modelsTable } from '../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { MatchEngine, Match, Game,ClockManager } from '../game/MatchEngine'
import { ChessGame } from '../chess/ChessGame'
import type { EventData } from '@llm-chess-arena/shared'

export class DatabaseService {
  private engine: MatchEngine
  // Per-match watermark: how many engine events have been persisted
  private savedEventCounts = new Map<string, number>()
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = initializeDatabase().catch((err) => {
      console.error('⚠️  Failed to initialize database:', err)
    })
    this.engine = new MatchEngine()
  }

  async ensureInitialized(): Promise<void> {
    await this.initPromise
  }

  getEngine(): MatchEngine {
    return this.engine
  }

  // Persist a match to database
  async saveMatch(match: Match): Promise<void> {
    await this.ensureInitialized()
    const existing = await db.select().from(matches).where(eq(matches.id, match.id)).get()
    const values = {
      id: match.id,
      playerAId: match.playerAId,
      playerBId: match.playerBId,
      playerAModel: JSON.stringify(match.playerAModel),
      playerBModel: JSON.stringify(match.playerBModel),
      status: match.status,
      timeControl: match.timeControl,
      startingPosition: match.startingPosition,
      chess960Seed: match.chess960Seed,
      boardMode: match.boardMode,
      isPrivate: match.isPrivate ?? false,
      createdAt: match.createdAt,
      completedAt: match.completedAt || null,
    }
    if (existing) {
      await db.update(matches).set(values).where(eq(matches.id, match.id))
    } else {
      await db.insert(matches).values(values)
    }

    // Save all games
    for (const game of match.games) {
      await this.saveGame(game)
    }
  }

  // Persist a game to database
  async saveGame(game: Game): Promise<void> {
    await this.ensureInitialized()
    const existing = await db.select().from(games).where(eq(games.id, game.id)).get()
    const values = {
      id: game.id,
      matchId: game.matchId,
      gameNumber: game.gameNumber,
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      status: game.status,
      result: game.result ? JSON.stringify(game.result) : null,
      resultReason: game.result?.reason || null,
      fenInitial: game.fenInitial,
      fenFinal: game.fenFinal,
      moveCount: game.moveCount,
      createdAt: game.createdAt,
      completedAt: game.completedAt || null,
    }
    if (existing) {
      await db.update(games).set(values).where(eq(games.id, game.id))
    } else {
      await db.insert(games).values(values)
    }
  }

  // Persist an event to database
  async saveEvent(event: {
    matchId: string
    gameId: string
    eventType: string
    playerId: string
    data: EventData
    timestamp: Date
    gameMove?: number
    clockWhite?: number
    clockBlack?: number
  }): Promise<void> {
    await this.ensureInitialized()
    await db.insert(events).values({
      gameId: event.gameId,
      eventType: event.eventType,
      playerId: event.playerId,
      data: JSON.stringify(event.data),
      timestamp: event.timestamp,
      gameMove: event.gameMove || null,
      clockWhite: event.clockWhite || null,
      clockBlack: event.clockBlack || null,
    })
  }

  // Persist all engine events not yet written (watermarked per match so
  // co-emitted events like move + game_over are never skipped)
  async saveNewEvents(matchId: string): Promise<void> {
    await this.ensureInitialized()
    const allEvents = this.engine.getEvents(matchId)
    const alreadySaved = this.savedEventCounts.get(matchId) ?? 0
    for (const event of allEvents.slice(alreadySaved)) {
      await this.saveEvent(event)
    }
    this.savedEventCounts.set(matchId, allEvents.length)
  }

  async saveMessages(gameId: string, messages: Array<{ id: string; sender: string; content: string; timestamp: Date }>): Promise<void> {
    await this.ensureInitialized()
    if (messages.length === 0) return
    await db.delete(messagesTable).where(eq(messagesTable.gameId, gameId))
    await db.insert(messagesTable).values(
      messages.map(m => ({
        content: m.content,
        gameId,
        id: m.id,
        sender: m.sender,
        timestamp: m.timestamp,
      })),
    ).onConflictDoNothing()
  }

  async loadMessages(gameId: string): Promise<Array<{ id: string; sender: string; content: string; timestamp: Date }>> {
    await this.ensureInitialized()
    const rows = await db.select().from(messagesTable).where(eq(messagesTable.gameId, gameId))
    return rows.map(r => ({
      content: r.content,
      id: r.id,
      sender: r.sender,
      timestamp: r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp),
    }))
  }

  async saveModels(models: Array<{ id: string; name: string; provider: string; config: unknown }>): Promise<void> {
    await this.ensureInitialized()
    await db.delete(modelsTable)
    if (models.length === 0) return
    await db.insert(modelsTable).values(
      models.map(m => ({
        config: JSON.stringify(m.config),
        id: m.id,
        name: m.name,
        provider: m.provider,
      })),
    )
  }

  async addModel(model: { id: string; name: string; provider: string; config: unknown }): Promise<void> {
    await this.ensureInitialized()
    await db.insert(modelsTable).values({
      config: JSON.stringify(model.config),
      id: model.id,
      name: model.name,
      provider: model.provider,
    })
  }

  async deleteModel(modelId: string): Promise<void> {
    await this.ensureInitialized()
    await db.delete(modelsTable).where(eq(modelsTable.id, modelId))
  }

  async loadModels(): Promise<Array<{ id: string; name: string; provider: string; config: unknown }>> {
    await this.ensureInitialized()
    const rows = await db.select().from(modelsTable)
    if (rows.length === 0) {
      // Seed default benchmark models if empty
      const defaults = [
        {
          config: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
          id: 'MODEL-default-gpt4o',
          name: 'gpt-4o',
          provider: 'openai',
        },
        {
          config: { maxOutputTokens: 4096, name: 'claude-3-5-sonnet', provider: 'anthropic', temperature: 0.7, version: '1.0' },
          id: 'MODEL-default-claude35',
          name: 'claude-3-5-sonnet',
          provider: 'anthropic',
        },
        {
          config: { maxOutputTokens: 4096, name: 'gemini-1.5-pro', provider: 'google', temperature: 0.7, version: '1.0' },
          id: 'MODEL-default-gemini15',
          name: 'gemini-1.5-pro',
          provider: 'google',
        },
      ]
      await this.saveModels(defaults)
      return defaults
    }
    return rows.map(r => ({
      config: JSON.parse(r.config),
      id: r.id,
      name: r.name,
      provider: r.provider,
    }))
  }

  // Save or update rating
  async saveRating(modelName: string, provider: string, rating: {
    rating: number
    rd: number
    volatility: number
    gamesPlayed: number
  }): Promise<void> {
    await this.ensureInitialized()
    const existing = await db.select().from(ratings).where(eq(ratings.modelName, modelName)).get()
    if (existing) {
      await db.update(ratings)
        .set({
          gamesPlayed: rating.gamesPlayed,
          glickoRating: rating.rating,
          glickoRd: rating.rd,
          glickoVolatility: rating.volatility,
          lastUpdated: new Date(),
        })
        .where(eq(ratings.modelName, modelName))
    } else {
      await db.insert(ratings).values({
        gamesPlayed: rating.gamesPlayed,
        glickoRating: rating.rating,
        glickoRd: rating.rd,
        glickoVolatility: rating.volatility,
        lastUpdated: new Date(),
        modelName,
        provider,
      })
    }
  }

  // Get all ratings from database
  async getAllRatings(): Promise<{ model: string; provider: string; rating: number; rd: number; gamesPlayed: number }[]> {
    await this.ensureInitialized()
    const dbRatings = await db.select().from(ratings)
    return dbRatings.map(r => ({
      model: r.modelName,
      provider: r.provider,
      rating: r.glickoRating,
      rd: r.glickoRd,
      gamesPlayed: r.gamesPlayed,
    }))
  }

  // Reconstitute in-memory engine state from SQLite on startup
  async loadMatches(): Promise<void> {
    await this.ensureInitialized()
    const dbMatches = await db.select().from(matches)

    for (const dbMatch of dbMatches) {
      const dbGames = await db.select().from(games).where(eq(games.matchId, dbMatch.id))

      const matchGames: Game[] = dbGames.map(g => ({
        apiCallsThisGame: { black: 0, white: 0 },
        apiCallsThisTurn: { black: 0, white: 0 },
        blackPlayerId: g.blackPlayerId,
        chessGame: new ChessGame(g.fenInitial),
        clock: new ClockManager(dbMatch.timeControl),
        completedAt: g.completedAt ? (g.completedAt instanceof Date ? g.completedAt : new Date(g.completedAt * 1000)) : null,
        createdAt: g.createdAt instanceof Date ? g.createdAt : new Date(g.createdAt * 1000),
        drawOfferCooldown: 0,
        drawOfferPending: null,
        fenFinal: g.fenFinal,
        fenInitial: g.fenInitial,
        gameNumber: g.gameNumber,
        id: g.id,
        matchId: g.matchId,
        messages: [], // populated from DB below
        moveCount: g.moveCount,
        moves: [],
        result: g.result ? JSON.parse(g.result) : null,
        // SAFETY: g.status is stored as a string and matches GameStatus union
        status: g.status as 'pending' | 'active' | 'completed',
        // Story 33: Generate fresh display IDs per game (not persisted, regenerated on load)
        displayPlayerAId: `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        displayPlayerBId: `P-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        tokensThisGame: { black: 0, white: 0 },
        tokensThisMove: { black: 0, white: 0 },
        whitePlayerId: g.whitePlayerId,
      }))

      // Load events to reconstruct move history
      for (const game of matchGames) {
        const gameEvents = await db.select().from(events).where(eq(events.gameId, game.id))
        const moveEvents = gameEvents.filter(e => e.eventType === 'move')
        for (const moveEvent of moveEvents) {
          const data = JSON.parse(moveEvent.data)
          game.moves.push(data.move)
          game.chessGame.makeMove(data.move)
        }
      }

      // Find current game index
      const currentGameIndex = matchGames.findIndex(g => g.status === 'active')

      const match: Match = {
        id: dbMatch.id,
        playerAId: dbMatch.playerAId,
        playerBId: dbMatch.playerBId,
        // SAFETY: playerAModel was written by saveMatch as JSON.stringify(ModelConfig)
        playerAModel: JSON.parse(dbMatch.playerAModel),
        // SAFETY: playerBModel was written by saveMatch as JSON.stringify(ModelConfig)
        playerBModel: JSON.parse(dbMatch.playerBModel),
        // SAFETY: dbMatch.status is stored as "active" | "completed"
        status: dbMatch.status as 'active' | 'completed',
        timeControl: dbMatch.timeControl,
        // SAFETY: dbMatch.startingPosition is stored as "standard" | "chess960"
        startingPosition: dbMatch.startingPosition as 'standard' | 'chess960',
        // SAFETY: dbMatch.boardMode is stored as "pure" | "assisted"
        boardMode: dbMatch.boardMode as 'pure' | 'assisted',
        chess960Seed: dbMatch.chess960Seed ?? null,
        // SAFETY: type assertion is validated by upstream schema/parsing
        isPrivate: (dbMatch as any).isPrivate ?? false,
        games: matchGames,
        currentGameIndex: currentGameIndex >= 0 ? currentGameIndex : 0,
        createdAt: dbMatch.createdAt instanceof Date ? dbMatch.createdAt : new Date(dbMatch.createdAt * 1000),
        completedAt: dbMatch.completedAt ? (dbMatch.completedAt instanceof Date ? dbMatch.completedAt : new Date(dbMatch.completedAt * 1000)) : null,
      }

      // Load persisted chat messages into each game
      for (const game of matchGames) {
        game.messages = await this.loadMessages(game.id)
      }

      // Restore events into the engine and mark them as already saved
      const savedRows = await db
        .select()
        .from(events)
        .where(inArray(events.gameId, matchGames.map(g => g.id)))
      this.engine.restoreEvents(savedRows.map(r => ({
        // SAFETY: data was written by saveEvent as JSON.stringify(EventData)
        data: JSON.parse(r.data) as EventData,
        eventType: r.eventType,
        gameId: r.gameId,
        matchId: dbMatch.id,
        playerId: r.playerId,
        timestamp: r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp),
      })))
      this.savedEventCounts.set(match.id, savedRows.length)

      // Add to engine's internal state
      this.engine.addMatch(match)
    }
  }

  // Clear all data (for tests) — children first to satisfy FK constraints
  async clearAll(): Promise<void> {
    await this.ensureInitialized()
    await db.delete(messagesTable)
    await db.delete(modelsTable)
    await db.delete(events)
    await db.delete(games)
    await db.delete(matches)
    await db.delete(ratings)
    this.savedEventCounts.clear()
  }

  // Load ratings from database
  async loadRatings(): Promise<Array<{
    modelName: string
    provider: string
    rating: number
    rd: number
    volatility: number
    gamesPlayed: number
  }>> {
    await this.ensureInitialized()
    const dbRatings = await db.select().from(ratings)
    return dbRatings.map(r => ({
      modelName: r.modelName,
      provider: r.provider,
      rating: r.glickoRating,
      rd: r.glickoRd,
      volatility: r.glickoVolatility,
      gamesPlayed: r.gamesPlayed,
    }))
  }
}

const globalForDb = globalThis as unknown as {
  __llm_chess_database__?: DatabaseService
}
export const database = globalForDb.__llm_chess_database__ ?? new DatabaseService()
globalForDb.__llm_chess_database__ = database
