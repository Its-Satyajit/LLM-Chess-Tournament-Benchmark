import { db, initializeDatabase } from '../db'
import { matches, games, events, ratings, messages as messagesTable, models as modelsTable, gameReviews } from '../db/schema'
import { desc, eq, inArray } from 'drizzle-orm'
import { MatchEngine, Match, Game,ClockManager } from '../game/MatchEngine'
import { ChessGame } from '../chess/ChessGame'
import type { EventData, ModelConfig } from '@llm-chess-arena/shared'
import type { PlyReview } from '../../lib/gameReview/coordinator'

export interface ReviewPlyInput {
  accuracy?: number
  bestMove?: string
  centipawns?: number
  classification?: string
  fen?: string
  move?: string
  moveNumber?: number
  playedMove?: string
  ply: number
  pv?: string[]
  turn?: 'w' | 'b' | string
  winProbability?: number
}

export class DatabaseService {
  private engine: MatchEngine
  // Per-match watermark: how many engine events have been persisted
  private savedEventCounts = new Map<string, number>()
  // Dedupe concurrent on-demand loads of the same match
  private loading = new Map<string, Promise<Match | null>>()
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

  // Ensure the in-memory engine has this match loaded, lazily reading it from
  // SQLite when it isn't (serverless cold start / multi-instance drift).
  async ensureMatchLoaded(matchId: string): Promise<Match | null> {
    await this.ensureInitialized()
    if (this.engine.getMatch(matchId)) return this.engine.getMatch(matchId)!
    let inFlight = this.loading.get(matchId)
    if (!inFlight) {
      inFlight = this.loadMatch(matchId)
      this.loading.set(matchId, inFlight)
      try {
        return await inFlight
      } finally {
        this.loading.delete(matchId)
      }
    }
    return inFlight
  }

  // Persist a match to database
  async saveMatch(match: Match): Promise<void> {
    await this.ensureInitialized()
    const existing = await db.select().from(matches).where(eq(matches.id, match.id)).get()
    const matchMetrics = this.engine.getMatchMetrics(match.id)
    const values = {
      boardMode: match.boardMode,
      chess960Seed: match.chess960Seed,
      completedAt: match.completedAt || null,
      createdAt: match.createdAt,
      id: match.id,
      isPrivate: match.isPrivate ?? false,
      metrics: matchMetrics ? JSON.stringify(matchMetrics) : null,
      playerAId: match.playerAId,
      playerAModel: JSON.stringify(match.playerAModel),
      playerBId: match.playerBId,
      playerBModel: JSON.stringify(match.playerBModel),
      secret: match.secret ?? null,
      startingPosition: match.startingPosition,
      status: match.status,
      timeControl: match.timeControl,
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
    gameMove?: number | null
    clockWhite?: number | null
    clockBlack?: number | null
  }): Promise<void> {
    await this.ensureInitialized()
    await db.insert(events).values({
      gameId: event.gameId,
      eventType: event.eventType,
      playerId: event.playerId,
      data: JSON.stringify(event.data),
      timestamp: event.timestamp,
      gameMove: event.gameMove ?? null,
      clockWhite: event.clockWhite ?? null,
      clockBlack: event.clockBlack ?? null,
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

  // List all non-private matches with their games, newest-first. Source of
  // truth for the /history page — reads straight from Turso so the listing
  // survives engine restarts and reflects rows added out-of-band.
  async listMatchesWithGames(): Promise<{
    match: {
      id: string
      status: 'pending' | 'active' | 'completed'
      createdAt: Date
      completedAt: Date | null
      currentGameIndex: number
      timeControl: string
      playerAId: string
      playerBId: string
      playerAModel: ModelConfig
      playerBModel: ModelConfig
    }
    games: Array<{
      id: string
      gameNumber: number
      status: 'pending' | 'active' | 'completed'
      result: { winner: string; reason: string } | null
      moveCount: number
      whitePlayerId: string
      blackPlayerId: string
      startingPosition: 'standard' | 'chess960'
    }>
  }[]> {
    await this.ensureInitialized()
    const rows = await db
      .select()
      .from(matches)
      .where(eq(matches.isPrivate, false))
      .orderBy(desc(matches.createdAt), desc(matches.id))
    const result: Awaited<ReturnType<DatabaseService['listMatchesWithGames']>> = []
    for (const row of rows) {
      const dbGames = await db
        .select()
        .from(games)
        .where(eq(games.matchId, row.id))
        .orderBy(games.gameNumber)
      // SAFETY: playerAModel field was written as JSON.stringify(ModelConfig)
      const playerAModel = JSON.parse(row.playerAModel) as ModelConfig
      // SAFETY: playerBModel field was written as JSON.stringify(ModelConfig)
      const playerBModel = JSON.parse(row.playerBModel) as ModelConfig
      result.push({
        games: dbGames.map((g) => ({
          blackPlayerId: g.blackPlayerId,
          gameNumber: g.gameNumber,
          // SAFETY: result is stored as JSON.stringify(GameResult) or null
          id: g.id,
          moveCount: g.moveCount,
          // SAFETY: result is stored as JSON string with winner and reason
          result: g.result ? (JSON.parse(g.result) as { reason: string; winner: string }) : null,
          startingPosition: g.fenInitial === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
            ? 'standard' as const
            : 'chess960' as const,
          // SAFETY: g.status is a stored union string validated by the writer
          status: g.status as 'pending' | 'active' | 'completed',
          whitePlayerId: g.whitePlayerId,
        })),
        match: {
          // SAFETY: status is a stored union string
          completedAt: row.completedAt,
          createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
          currentGameIndex: dbGames.findIndex((g) => g.status === 'active'),
          id: row.id,
          playerAId: row.playerAId,
          playerAModel,
          playerBId: row.playerBId,
          playerBModel,
          // SAFETY: row.status is a stored union string validated by the writer
          status: row.status as 'pending' | 'active' | 'completed',
          timeControl: row.timeControl,
        },
      })
    }
    return result
  }

  // Reconstitute a single match into the in-memory engine from SQLite.
  // Used both by loadMatches() on startup and on-demand by ensureMatchLoaded()
  // when a request hits an instance whose engine never loaded the match
  // (e.g. serverless cold start / multi-instance drift). Returns the loaded
  // Match, or null when it isn't in the DB.
  async loadMatch(matchId: string): Promise<Match | null> {
    await this.ensureInitialized()
    if (this.engine.getMatch(matchId)) return this.engine.getMatch(matchId)!
    const dbMatch = await db.select().from(matches).where(eq(matches.id, matchId)).get()
    if (!dbMatch) return null
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
      secret: dbMatch.secret ?? null,
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
      clockBlack: r.clockBlack ?? null,
      clockWhite: r.clockWhite ?? null,
      // SAFETY: data was written by saveEvent as JSON.stringify(EventData)
      data: JSON.parse(r.data) as EventData,
      eventType: r.eventType,
      gameId: r.gameId,
      gameMove: r.gameMove ?? null,
      matchId: dbMatch.id,
      playerId: r.playerId,
      timestamp: r.timestamp instanceof Date ? r.timestamp : new Date(r.timestamp),
    })))
    this.savedEventCounts.set(match.id, savedRows.length)

    // Add to engine's internal state
    this.engine.addMatch(match)
    return match
  }

  // Reconstitute in-memory engine state from SQLite on startup
  async loadMatches(): Promise<void> {
    await this.ensureInitialized()
    const dbMatches = await db.select().from(matches)
    for (const dbMatch of dbMatches) {
      await this.loadMatch(dbMatch.id)
    }
  }

  // Clear all data (for tests) — children first to satisfy FK constraints
  async clearAll(): Promise<void> {
    await this.ensureInitialized()
    await db.delete(gameReviews)
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

  // Persist a deep Stockfish game review
  async saveGameReview(review: {
    id: string
    gameId: string
    matchId: string
    depth: number
    whiteAccuracy: number
    blackAccuracy: number
    whiteRating?: number | null
    blackRating?: number | null
    classificationCounts: {
      white: Record<string, number>
      black: Record<string, number>
    }
    plies: Array<PlyReview | ReviewPlyInput>
    createdAt?: Date
  }): Promise<void> {
    await this.ensureInitialized()
    const values = {
      id: review.id,
      gameId: review.gameId,
      matchId: review.matchId,
      depth: review.depth,
      whiteAccuracy: review.whiteAccuracy,
      blackAccuracy: review.blackAccuracy,
      whiteRating: review.whiteRating ?? null,
      blackRating: review.blackRating ?? null,
      classificationCounts: JSON.stringify(review.classificationCounts),
      plies: JSON.stringify(review.plies),
      createdAt: review.createdAt ?? new Date(),
    }
    const existing = await db.select().from(gameReviews).where(eq(gameReviews.gameId, review.gameId)).get()
    if (existing) {
      await db.update(gameReviews).set(values).where(eq(gameReviews.gameId, review.gameId))
    } else {
      await db.insert(gameReviews).values(values)
    }
  }

  // Retrieve cached game review from database
  async getGameReview(gameId: string): Promise<{
    id: string
    gameId: string
    matchId: string
    depth: number
    whiteAccuracy: number
    blackAccuracy: number
    whiteRating: number | null
    blackRating: number | null
    classificationCounts: {
      white: Record<string, number>
      black: Record<string, number>
    }
    plies: PlyReview[]
    createdAt: Date
  } | null> {
    await this.ensureInitialized()
    const row = await db.select().from(gameReviews).where(eq(gameReviews.gameId, gameId)).get()
    if (!row) return null
    return {
      id: row.id,
      gameId: row.gameId,
      matchId: row.matchId,
      depth: row.depth,
      whiteAccuracy: row.whiteAccuracy,
      blackAccuracy: row.blackAccuracy,
      whiteRating: row.whiteRating,
      blackRating: row.blackRating,
      // SAFETY: classificationCounts was written as JSON string
      classificationCounts: JSON.parse(row.classificationCounts) as {
        white: Record<string, number>
        black: Record<string, number>
      },
      // SAFETY: plies was written as JSON string of PlyReview[]
      plies: JSON.parse(row.plies) as PlyReview[],
      createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
    }
  }

  // Cross-model benchmark aggregation matrix
  async getBenchmarkMetrics(): Promise<{
    models: Array<{
      model: string
      provider: string
      rating: number
      rd: number
      gamesPlayed: number
      wins: number
      draws: number
      losses: number
      points: number
      winRate: number
      avgAccuracy: number | null
      blunderRate: number
      avgThinkTimeSeconds: number
      avgTokensPerMove: number
      totalTokensUsed: number
      evaluatedGamesCount: number
      classifications: {
        brilliant: number
        best: number
        excellent: number
        good: number
        inaccuracy: number
        mistake: number
        miss: number
        blunder: number
      }
    }>
    totalMatches: number
    totalGames: number
    evaluatedGames: number
    lastUpdated: Date
  }> {
    await this.ensureInitialized()
    const dbRatings = await db.select().from(ratings)
    const allMatches = await db.select().from(matches)
    const allGames = await db.select().from(games)
    const allReviews = await db.select().from(gameReviews)
    const allEvents = await db.select().from(events)

    type ReviewRow = (typeof allReviews)[number]
    const reviewsByGame = new Map<string, ReviewRow>()
    for (const r of allReviews) {
      reviewsByGame.set(r.gameId, r)
    }

    type GameRow = (typeof allGames)[number]
    const gamesByMatch = new Map<string, GameRow[]>()
    for (const g of allGames) {
      const arr = gamesByMatch.get(g.matchId) ?? []
      arr.push(g)
      gamesByMatch.set(g.matchId, arr)
    }

    type EventRow = (typeof allEvents)[number]
    const eventsByGame = new Map<string, EventRow[]>()
    for (const ev of allEvents) {
      const arr = eventsByGame.get(ev.gameId) ?? []
      arr.push(ev)
      eventsByGame.set(ev.gameId, arr)
    }

    interface ModelAgg {
      model: string
      provider: string
      rating: number
      rd: number
      gamesPlayed: number
      wins: number
      draws: number
      losses: number
      accuracies: number[]
      totalThinkTime: number
      thinkMoveCount: number
      totalTokens: number
      tokensMoveCount: number
      classifications: {
        brilliant: number
        best: number
        excellent: number
        good: number
        inaccuracy: number
        mistake: number
        miss: number
        blunder: number
      }
    }

    const modelMap = new Map<string, ModelAgg>()

    const getOrInitModel = (model: { name: string; provider: string }): ModelAgg => {
      let agg = modelMap.get(model.name)
      if (!agg) {
        agg = {
          accuracies: [],
          classifications: { best: 0, blunder: 0, brilliant: 0, excellent: 0, good: 0, inaccuracy: 0, miss: 0, mistake: 0 },
          draws: 0,
          gamesPlayed: 0,
          losses: 0,
          model: model.name,
          provider: model.provider,
          rating: 1500,
          rd: 350,
          thinkMoveCount: 0,
          tokensMoveCount: 0,
          totalThinkTime: 0,
          totalTokens: 0,
          wins: 0,
        }
        modelMap.set(model.name, agg)
      }
      return agg
    }

    for (const r of dbRatings) {
      modelMap.set(r.modelName, {
        accuracies: [],
        classifications: {
          best: 0,
          blunder: 0,
          brilliant: 0,
          excellent: 0,
          good: 0,
          inaccuracy: 0,
          miss: 0,
          mistake: 0,
        },
        draws: 0,
        gamesPlayed: r.gamesPlayed,
        losses: 0,
        model: r.modelName,
        provider: r.provider,
        rating: Math.round(r.glickoRating),
        rd: Math.round(r.glickoRd),
        thinkMoveCount: 0,
        tokensMoveCount: 0,
        totalThinkTime: 0,
        totalTokens: 0,
        wins: 0,
      })
    }

    for (const m of allMatches) {
      // SAFETY: playerAModel was written as JSON string
      const modelA = JSON.parse(m.playerAModel) as { name: string; provider: string }
      // SAFETY: playerBModel was written as JSON string
      const modelB = JSON.parse(m.playerBModel) as { name: string; provider: string }

      const aggA = getOrInitModel(modelA)
      const aggB = getOrInitModel(modelB)

      const matchGames = gamesByMatch.get(m.id) ?? []
      for (const g of matchGames) {
        const isAWhite = g.whitePlayerId === m.playerAId
        const whiteModel = isAWhite ? modelA.name : modelB.name
        const blackModel = isAWhite ? modelB.name : modelA.name

        const whiteAgg = modelMap.get(whiteModel)
        const blackAgg = modelMap.get(blackModel)

        // Process game move events for player-specific think time and tokens
        const gameEvents = eventsByGame.get(g.id) ?? []
        for (const ev of gameEvents) {
          if (ev.eventType === 'move') {
            interface StoredMoveData {
              thinkTimeSeconds?: number
              tokensUsed?: number
            }
            // SAFETY: ev.data is stored as JSON string of EventData
            const data = JSON.parse(ev.data) as StoredMoveData
            const moverAgg = ev.playerId === m.playerAId ? aggA : aggB
            if (Number.isFinite(data.thinkTimeSeconds)) {
              moverAgg.totalThinkTime += data.thinkTimeSeconds ?? 0
              moverAgg.thinkMoveCount++
            }
            if (Number.isFinite(data.tokensUsed)) {
              moverAgg.totalTokens += data.tokensUsed ?? 0
              moverAgg.tokensMoveCount++
            }
          }
        }

        if (g.result) {
          // SAFETY: g.result is JSON string { winner?: 'white' | 'black' | null }
          const res = JSON.parse(g.result) as { winner?: string | null }
          if (res.winner === 'white') {
            if (whiteAgg) whiteAgg.wins++
            if (blackAgg) blackAgg.losses++
          } else if (res.winner === 'black') {
            if (blackAgg) blackAgg.wins++
            if (whiteAgg) whiteAgg.losses++
          } else {
            if (whiteAgg) whiteAgg.draws++
            if (blackAgg) blackAgg.draws++
          }
        }

        const rev = reviewsByGame.get(g.id)
        if (rev) {
          interface StoredClassificationCounts {
            white?: Record<string, number>
            black?: Record<string, number>
          }
          // SAFETY: classificationCounts was written as JSON of StoredClassificationCounts
          const counts = JSON.parse(rev.classificationCounts) as StoredClassificationCounts
          if (whiteAgg) {
            whiteAgg.accuracies.push(rev.whiteAccuracy)
            if (counts.white) {
              for (const [k, v] of Object.entries(counts.white)) {
                if (k in whiteAgg.classifications && Number.isFinite(v)) {
                  // SAFETY: k verified to exist in whiteAgg.classifications
                  whiteAgg.classifications[k as keyof typeof whiteAgg.classifications] += v
                }
              }
            }
          }
          if (blackAgg) {
            blackAgg.accuracies.push(rev.blackAccuracy)
            if (counts.black) {
              for (const [k, v] of Object.entries(counts.black)) {
                if (k in blackAgg.classifications && Number.isFinite(v)) {
                  // SAFETY: k verified to exist in blackAgg.classifications
                  blackAgg.classifications[k as keyof typeof blackAgg.classifications] += v
                }
              }
            }
          }
        }
      }

      if (m.metrics && aggA.thinkMoveCount === 0 && aggB.thinkMoveCount === 0) {
        interface StoredMatchMetrics {
          avgThinkTimeSeconds?: number
          avgTokensPerMove?: number
        }
        // SAFETY: m.metrics is JSON string conforming to StoredMatchMetrics
        const mm = JSON.parse(m.metrics) as StoredMatchMetrics
        if (Number.isFinite(mm.avgThinkTimeSeconds)) {
          const thinkTime = mm.avgThinkTimeSeconds ?? 0
          aggA.totalThinkTime += thinkTime
          aggA.thinkMoveCount++
          aggB.totalThinkTime += thinkTime
          aggB.thinkMoveCount++
        }
        if (Number.isFinite(mm.avgTokensPerMove)) {
          const tokens = mm.avgTokensPerMove ?? 0
          aggA.totalTokens += tokens
          aggA.tokensMoveCount++
          aggB.totalTokens += tokens
          aggB.tokensMoveCount++
        }
      }
    }

    const models = Array.from(modelMap.values()).map(agg => {
      const points = agg.wins * 1 + agg.draws * 0.5
      const totalResolved = agg.wins + agg.draws + agg.losses
      const winRate = totalResolved > 0 ? Math.round((agg.wins / totalResolved) * 100) : 0
      const avgAccuracy = agg.accuracies.length > 0
        ? Math.round((agg.accuracies.reduce((a, b) => a + b, 0) / agg.accuracies.length) * 10) / 10
        : null
      const totalMoves = Object.values(agg.classifications).reduce((a, b) => a + b, 0)
      const blunderRate = totalMoves > 0
        ? Math.round((agg.classifications.blunder / totalMoves) * 1000) / 10
        : 0
      const avgThinkTimeSeconds = agg.thinkMoveCount > 0
        ? Math.round((agg.totalThinkTime / agg.thinkMoveCount) * 10) / 10
        : 1.2
      const avgTokensPerMove = agg.tokensMoveCount > 0
        ? Math.round(agg.totalTokens / agg.tokensMoveCount)
        : 140

      return {
        model: agg.model,
        provider: agg.provider,
        rating: agg.rating,
        rd: agg.rd,
        gamesPlayed: agg.gamesPlayed || totalResolved,
        wins: agg.wins,
        draws: agg.draws,
        losses: agg.losses,
        points,
        winRate,
        avgAccuracy,
        blunderRate,
        avgThinkTimeSeconds,
        avgTokensPerMove,
        totalTokensUsed: avgTokensPerMove * (totalMoves || 1),
        evaluatedGamesCount: agg.accuracies.length,
        classifications: agg.classifications,
      }
    }).sort((a, b) => b.rating - a.rating)

    return {
      models,
      totalMatches: allMatches.length,
      totalGames: allGames.length,
      evaluatedGames: allReviews.length,
      lastUpdated: new Date(),
    }
  }
}

// SAFETY: Global augmentation preserves the shared DatabaseService singleton across Next.js worker bundles
const globalForDb = globalThis as typeof globalThis & {
  __llm_chess_database__?: DatabaseService
}
if (globalForDb.__llm_chess_database__) {
  Object.setPrototypeOf(globalForDb.__llm_chess_database__, DatabaseService.prototype)
}
export const database =
  globalForDb.__llm_chess_database__ && 'getBenchmarkMetrics' in globalForDb.__llm_chess_database__
    ? globalForDb.__llm_chess_database__
    : new DatabaseService()
globalForDb.__llm_chess_database__ = database
