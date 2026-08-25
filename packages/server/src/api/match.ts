import { Elysia, t, status } from 'elysia'
import {
  authenticateRequest,
  generatePlayerToken,
  rateLimiter,
  turnRateLimiter,
} from '../auth'
const engine = database.getEngine()

import { database } from '../services/database'
import type { ModelConfig } from '@llm-chess-arena/shared'



// Persist the latest game state, any new events, and chat messages
function persistTurn(matchId: string): void {
  const game = engine.getCurrentGame(matchId)
  if (game) {
    database.saveGame(game)
    void database.saveMessages(game.id, game.messages)
  }
  void database.saveNewEvents(matchId)
}

// --- Auth + rate-limit + budget gate for authenticated player routes ---

type Gate =
  | { playerId: string }
  | { failError: string; failStatus: 401 | 403 | 429; forfeit?: boolean }

function gate(
  headers: Record<string, string | undefined>,
  matchId: string,
  gameId: string,
  keyPrefix: string,
): Gate {
  const auth = authenticateRequest(headers, matchId)
  if (!auth.ok) {
    return { failError: auth.error, failStatus: auth.httpStatus }
  }

  if (!rateLimiter.check(`${keyPrefix}:${auth.playerId}`)) {
    return { failError: 'Rate limited: too many requests per second', failStatus: 429 }
  }
  if (!turnRateLimiter.check(`turn:${auth.playerId}`)) {
    return { failError: 'Rate limited: too many requests this turn', failStatus: 429 }
  }

  // ADR-004: Track API call; exceeding limits forfeits the game
  if (!engine.trackApiCall(matchId, gameId, auth.playerId)) {
    return { failError: 'API_LIMIT_EXCEEDED', failStatus: 403, forfeit: true }
  }

  return { playerId: auth.playerId }
}

function reject(fail: { failError: string; failStatus: 401 | 403 | 429; forfeit?: boolean }) {
  const body = fail.forfeit
    ? { error: fail.failError, forfeit: true }
    : { error: fail.failError }
  return status(fail.failStatus, body)
}

// ADR-003: wrap a player-facing action with clock start/stop.
// On flag fall the result gains gameOver/reason fields.
function withClock<T extends object>(
  matchId: string,
  gameId: string,
  playerId: string,
  action: () => T,
): T & { gameOver?: boolean; reason?: 'timeout' } {
  engine.startPlayerTurn(matchId, gameId, playerId)
  try {
    const result = action()
    const clockResult = engine.endPlayerTurn(matchId, gameId, playerId)
    if (clockResult.gameOver) {
      return { ...result, gameOver: true, reason: 'timeout' }
    }
    return result
  } catch (error) {
    engine.endPlayerTurn(matchId, gameId, playerId)
    throw error
  }
}

const matchRoutes = new Elysia({ prefix: '/api/match' })
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
    void database.saveNewEvents(match.id) // persist the match_created event

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
      return status(404, { error: 'Match not found' })
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

  // --- AUTHENTICATED (optional): Get game state (player-specific clock per ADR-005) ---
  .get('/:matchId/state/:gameId', ({ headers, params }) => {
    const auth = authenticateRequest(headers, params.matchId)
    const playerId = auth.ok ? auth.playerId : undefined

    if (!playerId) {
      // Spectator: no clock attribution, no clocks visible (ADR-005)
      return engine.getGameState(params.matchId, params.gameId, undefined)
    }

    // ADR-004: Track API call for budget enforcement
    if (!engine.trackApiCall(params.matchId, params.gameId, playerId)) {
      persistTurn(params.matchId)
      return status(403, { error: 'API_LIMIT_EXCEEDED', forfeit: true })
    }

    // ADR-003: Clock runs during API processing
    return withClock(params.matchId, params.gameId, playerId, () =>
      engine.getGameState(params.matchId, params.gameId, playerId),
    )
  })

  // --- AUTHENTICATED: Make move ---
  .post('/:matchId/move/:gameId', ({ body, headers, params }) => {
    const g = gate(headers, params.matchId, params.gameId, 'move')
    if ('failStatus' in g) {
      if (g.forfeit) {
        persistTurn(params.matchId)
      }
      return reject(g)
    }
    const { playerId } = g

    // Story 35: track token usage reported by the calling model
    const tokensUsed = body.tokensUsed ?? Math.ceil((body.move.length + 64) / 4)
    if (!engine.trackTokens(params.matchId, params.gameId, playerId, tokensUsed)) {
      persistTurn(params.matchId)
      return status(403, { error: 'TOKEN_LIMIT_EXCEEDED', forfeit: true })
    }

    // ADR-003: Clock runs during API processing
    const result = withClock(params.matchId, params.gameId, playerId, () =>
      engine.makeMove(params.matchId, params.gameId, playerId, body.move),
    )
    persistTurn(params.matchId)

    // Story 45: the per-turn allowance resets when a move is accepted
    if (result.accepted) {
      const currentGame = engine.getCurrentGame(params.matchId)
      if (currentGame) {
        turnRateLimiter.reset(`turn:${currentGame.whitePlayerId}`)
        turnRateLimiter.reset(`turn:${currentGame.blackPlayerId}`)
      }
    }
    return result
  }, {
    body: t.Object({
      move: t.String({ minLength: 4, maxLength: 10 }),
      tokensUsed: t.Optional(t.Number({ minimum: 0 })),
    }),
  })

  // --- AUTHENTICATED: Send message ---
  .post('/:matchId/message/:gameId', ({ body, headers, params }) => {
    const g = gate(headers, params.matchId, params.gameId, 'msg')
    if ('failStatus' in g) {
      if (g.forfeit) {
        persistTurn(params.matchId)
      }
      return reject(g)
    }
    const { playerId } = g

    // ADR-003: Clock runs during API processing
    const result = withClock(params.matchId, params.gameId, playerId, () =>
      engine.sendMessage(params.matchId, params.gameId, playerId, body.content),
    )
    persistTurn(params.matchId)
    return result
  }, {
    body: t.Object({
      content: t.String({ minLength: 1, maxLength: 1000 }),
    }),
  })

  // --- AUTHENTICATED: Get messages ---
  .get('/:matchId/messages/:gameId', ({ headers, params }) => {
    const auth = authenticateRequest(headers, params.matchId)
    if (!auth.ok) {
      return status(auth.httpStatus, { error: auth.error })
    }
    return { messages: engine.getMessages(params.matchId, params.gameId, auth.playerId) }
  })

  // --- AUTHENTICATED: Draw offer / accept / reject ---
  .post('/:matchId/draw/:gameId', ({ headers, params }) => {
    const g = gate(headers, params.matchId, params.gameId, 'draw')
    if ('failStatus' in g) {
      if (g.forfeit) {
        persistTurn(params.matchId)
      }
      return reject(g)
    }
    const { playerId } = g

    const result = withClock(params.matchId, params.gameId, playerId, () =>
      engine.offerDraw(params.matchId, params.gameId, playerId),
    )
    persistTurn(params.matchId)
    return result
  })

  .post('/:matchId/draw/:gameId/accept', ({ headers, params }) => {
    const g = gate(headers, params.matchId, params.gameId, 'draw')
    if ('failStatus' in g) {
      if (g.forfeit) {
        persistTurn(params.matchId)
      }
      return reject(g)
    }
    const { playerId } = g

    const result = withClock(params.matchId, params.gameId, playerId, () =>
      engine.acceptDraw(params.matchId, params.gameId, playerId),
    )
    persistTurn(params.matchId)
    return result
  })

  .post('/:matchId/draw/:gameId/reject', ({ headers, params }) => {
    const g = gate(headers, params.matchId, params.gameId, 'draw')
    if ('failStatus' in g) {
      if (g.forfeit) {
        persistTurn(params.matchId)
      }
      return reject(g)
    }
    const { playerId } = g

    const result = withClock(params.matchId, params.gameId, playerId, () =>
      engine.rejectDraw(params.matchId, params.gameId, playerId),
    )
    persistTurn(params.matchId)
    return result
  })

  // --- AUTHENTICATED: Resign ---
  .post('/:matchId/resign/:gameId', ({ headers, params }) => {
    const g = gate(headers, params.matchId, params.gameId, 'resign')
    if ('failStatus' in g) {
      if (g.forfeit) {
        persistTurn(params.matchId)
      }
      return reject(g)
    }
    const { playerId } = g

    const result = withClock(params.matchId, params.gameId, playerId, () =>
      engine.resign(params.matchId, params.gameId, playerId),
    )
    persistTurn(params.matchId)
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
      return status(404, { error: 'Match not found' })
    }
    return metrics
  })

export default matchRoutes
export { engine }
