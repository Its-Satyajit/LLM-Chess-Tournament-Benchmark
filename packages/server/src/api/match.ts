import { Elysia, t } from 'elysia'
import { extractPlayerId, rateLimiter, turnRateLimiter, generatePlayerToken } from '../auth'
import { DatabaseService } from '../services/database'
import type { ModelConfig } from '@llm-chess-arena/shared'

const database = new DatabaseService(),
  engine = database.getEngine(),

  matchRoutes = new Elysia({ prefix: '/api/match' })
    // --- PUBLIC: Create match (returns JWT tokens) ---
    .post('/create', async ({ body }) => {
      const match = engine.createMatch({
        // SAFETY: boardMode defaults to "assisted" and matches BoardMode union
        boardMode: (body.boardMode || 'assisted') as 'pure' | 'assisted',
        isPrivate: body.isPrivate ?? false,
        // SAFETY: type assertion is validated by upstream schema/parsing
        playerAModel: body.playerAModel as ModelConfig,
        // SAFETY: type assertion is validated by upstream schema/parsing
        playerBModel: body.playerBModel as ModelConfig,
        // SAFETY: startingPosition defaults to "standard" and matches GameMode union
        startingPosition: (body.startingPosition || 'standard') as 'standard' | 'chess960',
        timeControl: body.timeControl || '10+5',
      })

      await database.saveMatch(match)

      return {
        games: match.games.map(g => ({
          blackPlayerId: g.blackPlayerId,
          displayPlayerAId: g.displayPlayerAId,
          displayPlayerBId: g.displayPlayerBId,
          id: g.id,
          whitePlayerId: g.whitePlayerId,
        })),
        matchId: match.id,
        playerAToken: generatePlayerToken(match.playerAId, match.id),
        playerAId: match.playerAId,
        playerBToken: generatePlayerToken(match.playerBId, match.id),
        playerBId: match.playerBId,
      }
    }, {
      body: t.Object({
        boardMode: t.Optional(t.String()),
        isPrivate: t.Optional(t.Boolean()),
        playerAModel: t.Object({
          maxOutputTokens: t.Number(),
          name: t.String(),
          provider: t.String(),
          temperature: t.Number(),
          version: t.String(),
        }),
        playerBModel: t.Object({
          maxOutputTokens: t.Number(),
          name: t.String(),
          provider: t.String(),
          temperature: t.Number(),
          version: t.String(),
        }),
        startingPosition: t.Optional(t.String()),
        timeControl: t.Optional(t.String()),
      }),
    })

    // --- PUBLIC: Get match info (spectators) ---
    .get('/:matchId', ({ params }) => {
      const match = engine.getMatch(params.matchId)
      if (!match) {
        return { error: 'Match not found' }
      }

      return {
        currentGameIndex: match.currentGameIndex,
        games: match.games.map(g => ({
          blackPlayerId: g.blackPlayerId,
          displayPlayerAId: g.displayPlayerAId,
          displayPlayerBId: g.displayPlayerBId,
          gameNumber: g.gameNumber,
          id: g.id,
          moveCount: g.moveCount,
          result: g.result,
          status: g.status,
          whitePlayerId: g.whitePlayerId,
        })),
        id: match.id,
        playerAId: match.playerAId,
        playerBId: match.playerBId,
        status: match.status,
      }
    })

    // --- AUTHENTICATED: Get game state (player-specific clock per ADR-005) ---
    .get('/:matchId/state/:gameId', ({ headers, params }) => {
      const playerId = extractPlayerId(headers)
      if (playerId) {
        // ADR-004: Track API call for budget enforcement
        engine.trackApiCall(params.matchId, params.gameId, playerId)
        // ADR-003: Clock runs during API processing
        engine.startPlayerTurn(params.matchId, params.gameId, playerId)
      }
      const state = engine.getGameState(params.matchId, params.gameId, playerId ?? undefined)
      if (playerId) {
        const clockResult = engine.endPlayerTurn(params.matchId, params.gameId, playerId)
        if (clockResult.gameOver) {
          return { ...state, gameOver: true, reason: 'timeout' }
        }
      }
      // Public view: no auth = both clocks visible (spectator mode)
      return state
    })

    // --- AUTHENTICATED: Make move ---
    .post('/:matchId/move/:gameId', ({ body, headers, params }) => {
      const playerId = extractPlayerId(headers)
      if (!playerId) {
        return { error: 'Unauthorized' }
      }

      if (!rateLimiter.check(`move:${playerId}`)) {
        return { error: 'Rate limited: too many requests per second' }
      }
      if (!turnRateLimiter.check(`turn:${playerId}`)) {
        return { error: 'Rate limited: too many requests this turn' }
      }

      // ADR-003: Clock runs during API processing
      engine.startPlayerTurn(params.matchId, params.gameId, playerId)
      const result = engine.makeMove(params.matchId, params.gameId, playerId, body.move)
      engine.endPlayerTurn(params.matchId, params.gameId, playerId)

      // Persist
      const game = engine.getCurrentGame(params.matchId)
      if (game) {
        database.saveGame(game)
      }
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        database.saveEvent(event)
      }

      return result
    }, {
      body: t.Object({
        move: t.String({ minLength: 4, maxLength: 10 }),
      }),
    })

    // --- AUTHENTICATED: Send message ---
    .post('/:matchId/message/:gameId', ({ body, headers, params }) => {
      const playerId = extractPlayerId(headers)
      if (!playerId) {
        return { error: 'Unauthorized' }
      }

      if (!rateLimiter.check(`msg:${playerId}`)) {
        return { error: 'Rate limited: too many requests per second' }
      }
      if (!turnRateLimiter.check(`turn:${playerId}`)) {
        return { error: 'Rate limited: too many requests this turn' }
      }

      // ADR-004: Track API call for budget enforcement
      engine.trackApiCall(params.matchId, params.gameId, playerId)
      // ADR-003: Clock runs during API processing
      engine.startPlayerTurn(params.matchId, params.gameId, playerId)

      const result = engine.sendMessage(params.matchId, params.gameId, playerId, body.content)
      engine.endPlayerTurn(params.matchId, params.gameId, playerId)
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        database.saveEvent(event)
      }
      return result
    }, {
      body: t.Object({
        content: t.String({ minLength: 1, maxLength: 1000 }),
      }),
    })

    // --- AUTHENTICATED: Get messages ---
    .get('/:matchId/messages/:gameId', ({ headers, params }) => {
      const playerId = extractPlayerId(headers)
      if (!playerId) {
        return { messages: [] }
      }
      return { messages: engine.getMessages(params.matchId, params.gameId, playerId) }
    })

    // --- AUTHENTICATED: Draw offer ---
    .post('/:matchId/draw/:gameId', ({ headers, params }) => {
      const playerId = extractPlayerId(headers)
      if (!playerId) {
        return { error: 'Unauthorized' }
      }
      // ADR-004: Track API call for budget enforcement
      engine.trackApiCall(params.matchId, params.gameId, playerId)
      // ADR-003: Clock runs during API processing
      engine.startPlayerTurn(params.matchId, params.gameId, playerId)
      const result = engine.offerDraw(params.matchId, params.gameId, playerId)
      engine.endPlayerTurn(params.matchId, params.gameId, playerId)
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        database.saveEvent(event)
      }
      return result
    })

    // --- AUTHENTICATED: Accept draw ---
    .post('/:matchId/draw/:gameId/accept', ({ headers, params }) => {
      const playerId = extractPlayerId(headers)
      if (!playerId) {
        return { error: 'Unauthorized' }
      }
      // ADR-004: Track API call for budget enforcement
      engine.trackApiCall(params.matchId, params.gameId, playerId)
      // ADR-003: Clock runs during API processing
      engine.startPlayerTurn(params.matchId, params.gameId, playerId)
      const result = engine.acceptDraw(params.matchId, params.gameId, playerId)
      engine.endPlayerTurn(params.matchId, params.gameId, playerId)
      const game = engine.getCurrentGame(params.matchId)
      if (game) {
        database.saveGame(game)
      }
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        database.saveEvent(event)
      }
      return result
    })

    // --- AUTHENTICATED: Reject draw ---
    .post('/:matchId/draw/:gameId/reject', ({ headers, params }) => {
      const playerId = extractPlayerId(headers)
      if (!playerId) {
        return { error: 'Unauthorized' }
      }
      // ADR-004: Track API call for budget enforcement
      engine.trackApiCall(params.matchId, params.gameId, playerId)
      // ADR-003: Clock runs during API processing
      engine.startPlayerTurn(params.matchId, params.gameId, playerId)
      const result = engine.rejectDraw(params.matchId, params.gameId, playerId)
      engine.endPlayerTurn(params.matchId, params.gameId, playerId)
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        database.saveEvent(event)
      }
      return result
    })

    // --- AUTHENTICATED: Resign ---
    .post('/:matchId/resign/:gameId', ({ headers, params }) => {
      const playerId = extractPlayerId(headers)
      if (!playerId) {
        return { error: 'Unauthorized' }
      }
      // ADR-004: Track API call for budget enforcement
      engine.trackApiCall(params.matchId, params.gameId, playerId)
      // ADR-003: Clock runs during API processing
      engine.startPlayerTurn(params.matchId, params.gameId, playerId)
      const result = engine.resign(params.matchId, params.gameId, playerId)
      engine.endPlayerTurn(params.matchId, params.gameId, playerId)
      const game = engine.getCurrentGame(params.matchId)
      if (game) {
        database.saveGame(game)
      }
      const events = engine.getEvents(params.matchId)
      for (const event of events.slice(-1)) {
        database.saveEvent(event)
      }
      return result
    })

    // --- PUBLIC: Events (spectators) ---
    .get('/:matchId/events', ({ params }) => ({
      events: engine.getEvents(params.matchId),
    }))

    // --- PUBLIC: Metrics (spectators) ---
    .get('/:matchId/metrics', ({ params }) => {
      const metrics = engine.getMatchMetrics(params.matchId)
      if (!metrics) {
        return { error: 'Match not found' }
      }
      return metrics
    })

export default matchRoutes
export { engine }
