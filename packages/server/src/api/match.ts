import { Elysia, t } from 'elysia'
import { rateLimiter, turnRateLimiter, generatePlayerToken } from '../auth'
import { DatabaseService } from '../services/database'
import type { ModelConfig } from '@llm-chess-arena/shared'

const database = new DatabaseService(),
  engine = database.getEngine(),

  matchRoutes = new Elysia({ prefix: '/api/match' })
    // --- Public: Create match (returns JWT tokens) ---
    .post('/create', async ({ body }) => {
      const match = engine.createMatch({
        boardMode: (body.boardMode || 'assisted') as 'pure' | 'assisted',
        isPrivate: body.isPrivate ?? false,
        playerAModel: body.playerAModel as ModelConfig,
        playerBModel: body.playerBModel as ModelConfig,
        startingPosition: (body.startingPosition || 'standard') as 'standard' | 'chess960',
        timeControl: body.timeControl || '10+5',
      })

      await database.saveMatch(match)

      return {
        matchId: match.id,
        playerAToken: generatePlayerToken(match.playerAId, match.id),
        playerAId: match.playerAId,
        playerBToken: generatePlayerToken(match.playerBId, match.id),
        playerBId: match.playerBId,
        games: match.games.map(g => ({
          id: g.id,
          gameNumber: g.gameNumber,
          whitePlayerId: g.whitePlayerId,
          blackPlayerId: g.blackPlayerId,
        })),
      }
    }, {
      body: t.Object({
        boardMode: t.Optional(t.String()),
        playerAModel: t.Object({
          provider: t.String(),
          name: t.String(),
          version: t.String(),
          temperature: t.Number(),
          maxOutputTokens: t.Number(),
        }),
        playerBModel: t.Object({
          provider: t.String(),
          name: t.String(),
          version: t.String(),
          temperature: t.Number(),
          maxOutputTokens: t.Number(),
        }),
        isPrivate: t.Optional(t.Boolean()),
        startingPosition: t.Optional(t.String()),
        timeControl: t.Optional(t.String()),
      }),
    })

    // --- Public: Get match info (no auth needed for spectators) ---
    .get('/:matchId', ({ params }) => {
      const match = engine.getMatch(params.matchId)
      if (!match) {
        return { error: 'Match not found' }
      }

      return {
        id: match.id,
        status: match.status,
        currentGameIndex: match.currentGameIndex,
        games: match.games.map(g => ({
          id: g.id,
          gameNumber: g.gameNumber,
          status: g.status,
          result: g.result,
          moveCount: g.moveCount,
        })),
      }
    })

    // --- Authenticated player endpoints ---
    .get('/:matchId/state/:gameId', ({ params }) =>
      engine.getGameState(params.matchId, params.gameId),
    )

    .post('/:matchId/move/:gameId', async ({ params, body, headers }) => {
      const playerId = headers['x-player-id']
      if (!playerId) {
        return { error: 'Missing player ID' }
      }

      if (!rateLimiter.check(`move:${playerId}`)) {
        return { error: 'Rate limited: too many requests per second' }
      }
      if (!turnRateLimiter.check(`turn:${playerId}`)) {
        return { error: 'Rate limited: too many requests this turn' }
      }

      const result = engine.makeMove(params.matchId, params.gameId, playerId, body.move)

      // Persist
      const game = engine.getCurrentGame(params.matchId)
      if (game) {
        await database.saveGame(game)
      }
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        await database.saveEvent(event)
      }

      return result
    }, {
      body: t.Object({
        move: t.String({ minLength: 4, maxLength: 10 }),
      }),
    })

    .post('/:matchId/message/:gameId', async ({ params, body, headers }) => {
      const playerId = headers['x-player-id']
      if (!playerId) {
        return { error: 'Missing player ID' }
      }

      if (!rateLimiter.check(`msg:${playerId}`)) {
        return { error: 'Rate limited: too many requests per second' }
      }
      if (!turnRateLimiter.check(`turn:${playerId}`)) {
        return { error: 'Rate limited: too many requests this turn' }
      }

      const result = engine.sendMessage(params.matchId, params.gameId, playerId, body.content)
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        await database.saveEvent(event)
      }
      return result
    }, {
      body: t.Object({
        content: t.String({ minLength: 1, maxLength: 1000 }),
      }),
    })

    .get('/:matchId/messages/:gameId', ({ params, headers }) => {
      const playerId = headers['x-player-id']
      if (!playerId) {
        return { messages: [] }
      }
      return { messages: engine.getMessages(params.matchId, params.gameId, playerId) }
    })

    .post('/:matchId/draw/:gameId', async ({ params, headers }) => {
      const playerId = headers['x-player-id']
      if (!playerId) {
        return { error: 'Missing player ID' }
      }
      const result = engine.offerDraw(params.matchId, params.gameId, playerId)
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        await database.saveEvent(event)
      }
      return result
    })

    .post('/:matchId/draw/:gameId/accept', async ({ params, headers }) => {
      const playerId = headers['x-player-id']
      if (!playerId) {
        return { error: 'Missing player ID' }
      }
      const result = engine.acceptDraw(params.matchId, params.gameId, playerId)
      const game = engine.getCurrentGame(params.matchId)
      if (game) {
        await database.saveGame(game)
      }
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        await database.saveEvent(event)
      }
      return result
    })

    .post('/:matchId/draw/:gameId/reject', async ({ params, headers }) => {
      const playerId = headers['x-player-id']
      if (!playerId) {
        return { error: 'Missing player ID' }
      }
      const result = engine.rejectDraw(params.matchId, params.gameId, playerId)
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        await database.saveEvent(event)
      }
      return result
    })

    .post('/:matchId/resign/:gameId', async ({ params, headers }) => {
      const playerId = headers['x-player-id']
      if (!playerId) {
        return { error: 'Missing player ID' }
      }
      const result = engine.resign(params.matchId, params.gameId, playerId)
      const game = engine.getCurrentGame(params.matchId)
      if (game) {
        await database.saveGame(game)
      }
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        await database.saveEvent(event)
      }
      return result
    })

    .get('/:matchId/events', ({ params }) => ({
      events: engine.getEvents(params.matchId),
    }))

    .get('/:matchId/metrics', ({ params }) => {
      const metrics = engine.getMatchMetrics(params.matchId)
      if (!metrics) {
        return { error: 'Match not found' }
      }
      return metrics
    })

export default matchRoutes
export { engine }
