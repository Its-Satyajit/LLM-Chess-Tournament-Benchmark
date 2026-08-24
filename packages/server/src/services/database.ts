import { db, initializeDatabase } from '../db'
import { matches, games, events, ratings } from '../db/schema'
import { eq } from 'drizzle-orm'
import { MatchEngine, Match, Game } from '../game/MatchEngine'
import { ChessGame } from '../chess/ChessGame'
import { ClockManager } from '../game/MatchEngine'

export class DatabaseService {
  private engine: MatchEngine

  constructor() {
    initializeDatabase()
    this.engine = new MatchEngine()
  }

  getEngine(): MatchEngine {
    return this.engine
  }

  // Persist a match to database
  async saveMatch(match: Match): Promise<void> {
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
      chess960Seed: null,
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
    data: Record<string, unknown>
    timestamp: Date
    gameMove?: number
    clockWhite?: number
    clockBlack?: number
  }): Promise<void> {
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

  // Save or update rating
  async saveRating(modelName: string, provider: string, rating: {
    rating: number
    rd: number
    volatility: number
    gamesPlayed: number
  }): Promise<void> {
    const existing = await db.select().from(ratings).where(eq(ratings.modelName, modelName)).get()
    
    if (existing) {
      await db.update(ratings)
        .set({
          glickoRating: rating.rating,
          glickoRd: rating.rd,
          glickoVolatility: rating.volatility,
          gamesPlayed: rating.gamesPlayed,
          lastUpdated: new Date(),
        })
        .where(eq(ratings.modelName, modelName))
    } else {
      await db.insert(ratings).values({
        modelName,
        provider,
        glickoRating: rating.rating,
        glickoRd: rating.rd,
        glickoVolatility: rating.volatility,
        gamesPlayed: rating.gamesPlayed,
        lastUpdated: new Date(),
      })
    }
  }
  // Load all matches from database
  async loadMatches(): Promise<void> {
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
        messages: [],
        moveCount: g.moveCount,
        moves: [],
        result: g.result ? JSON.parse(g.result) : null,
        status: g.status as 'pending' | 'active' | 'completed',
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
        playerAModel: JSON.parse(dbMatch.playerAModel),
        playerBModel: JSON.parse(dbMatch.playerBModel),
        status: dbMatch.status as 'active' | 'completed',
        timeControl: dbMatch.timeControl,
        startingPosition: dbMatch.startingPosition as 'standard' | 'chess960',
        boardMode: dbMatch.boardMode as 'pure' | 'assisted',
        isPrivate: (dbMatch as any).isPrivate ?? false,
        games: matchGames,
        currentGameIndex: currentGameIndex >= 0 ? currentGameIndex : 0,
        createdAt: dbMatch.createdAt instanceof Date ? dbMatch.createdAt : new Date(dbMatch.createdAt * 1000),
        completedAt: dbMatch.completedAt ? (dbMatch.completedAt instanceof Date ? dbMatch.completedAt : new Date(dbMatch.completedAt * 1000)) : null,
      }

      // Add to engine's internal state
      this.engine.addMatch(match)
    }
  }

  // Clear all data (for tests)
  async clearAll(): Promise<void> {
    db.delete(events).run()
    db.delete(games).run()
    db.delete(matches).run()
    db.delete(ratings).run()
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

export const database = new DatabaseService()
