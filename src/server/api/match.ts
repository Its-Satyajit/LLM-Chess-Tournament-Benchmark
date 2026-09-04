import { Elysia, t, status } from 'elysia'
import {
  authenticateRequest,
  generatePlayerToken,
  rateLimiter,
  turnRateLimiter,
} from '../auth'
import { database } from '../services/database'
import type { ModelConfig } from '@llm-chess-arena/shared'

const engine = database.getEngine()



// Persist the latest game state, any new events, and chat messages
async function persistTurn(matchId: string): Promise<void> {
  const game = engine.getCurrentGame(matchId)
  if (game) {
    await database.saveGame(game)
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
  // Authenticate against the match's own secret (loaded from the DB) so token
  // verification no longer depends on a shared JWT_SECRET env across instances.
  const secret = engine.getMatch(matchId)?.secret ?? undefined
  const auth = authenticateRequest(headers, matchId, secret)
  if (!auth.ok) {
    return { failError: auth.error, failStatus: auth.httpStatus }
  }

  if (!rateLimiter.check(`${keyPrefix}:${auth.playerId}`)) {
    return { failError: 'Rate limited: too many requests per second', failStatus: 429 }
  }
  if (!turnRateLimiter.check(`turn:${auth.playerId}`)) {
    return { failError: 'Rate limited: too many requests this turn', failStatus: 429 }
  }

  // ADR-023: Track API call for non-move routes; makeMove handles its own budget without double-counting
  if (keyPrefix !== 'move' && !engine.trackApiCall(matchId, gameId, auth.playerId)) {
    return { failError: 'Rate limited: API call budget reached. Retry again.', failStatus: 429 }
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
  // --- PUBLIC: List all non-private matches (history page) — reads from Turso
  // so the listing survives engine restarts and shows rows the in-memory
  // engine map hasn't loaded yet.
  .get('/', async () => {
    const rows = await database.listMatchesWithGames()
    return {
      matches: rows.map(({ match, games: matchGames }) => ({
        completedAt: match.completedAt,
        createdAt: match.createdAt,
        currentGameIndex: match.currentGameIndex >= 0 ? match.currentGameIndex : 0,
        games: matchGames.map((g) => ({
          blackPlayerId: g.blackPlayerId,
          gameNumber: g.gameNumber,
          id: g.id,
          moveCount: g.moveCount,
          result: g.result,
          startingPosition: g.startingPosition,
          status: g.status,
          whitePlayerId: g.whitePlayerId,
        })),
        id: match.id,
        playerAId: match.playerAId,
        playerAModel: match.playerAModel,
        playerBId: match.playerBId,
        playerBModel: match.playerBModel,
        status: match.status,
        timeControl: match.timeControl,
      })),
    }
  })
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
      playerAToken: generatePlayerToken(match.playerAId, match.id, match.secret ?? undefined),
      playerAId: match.playerAId,
      playerBToken: generatePlayerToken(match.playerBId, match.id, match.secret ?? undefined),
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

  // --- PUBLIC: Mint valid player token(s) for a match from its DB per-match
  // secret. Used by the Arena/Admin UIs so the Bearer token injected into an
  // LLM prompt is always the server-issued token, never an externally-minted
  // one that fails verification.
  .get('/:matchId/tokens', async ({ params }) => {
    await database.ensureMatchLoaded(params.matchId)
    const match = engine.getMatch(params.matchId)
    if (!match) {
      return status(404, { error: 'Match not found' })
    }
    return {
      playerAId: match.playerAId,
      playerAToken: generatePlayerToken(match.playerAId, match.id, match.secret ?? undefined),
      playerBId: match.playerBId,
      playerBToken: generatePlayerToken(match.playerBId, match.id, match.secret ?? undefined),
    }
  })

  // --- PUBLIC: Get match info (spectators) ---
  .get('/:matchId', async ({ params }) => {
    await database.ensureMatchLoaded(params.matchId)
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
  .get('/:matchId/state/:gameId', async ({ headers, params }) => {
    await database.ensureMatchLoaded(params.matchId)
    const secret = engine.getMatch(params.matchId)?.secret ?? undefined
    const auth = authenticateRequest(headers, params.matchId, secret)
    const playerId = auth.ok ? auth.playerId : undefined

    if (!playerId) {
      // Spectator: no clock attribution, no clocks visible (ADR-005)
      try {
        return engine.getGameState(params.matchId, params.gameId)
      } catch {
        return status(404, { error: 'Game not found' })
      }
    }

    // ADR-023: Track API call for budget enforcement (non-forfeiting rate limit)
    if (!engine.trackApiCall(params.matchId, params.gameId, playerId)) {
      persistTurn(params.matchId)
      return status(429, { error: 'Rate limited: API call budget reached. Retry again.' })
    }

    // ADR-003: Clock runs during API processing
    return withClock(params.matchId, params.gameId, playerId, () =>
      engine.getGameState(params.matchId, params.gameId, playerId),
    )
  })

  // --- AUTHENTICATED: Make move ---
  .post('/:matchId/move/:gameId', async ({ body, headers, params }) => {
    await database.ensureMatchLoaded(params.matchId)
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

    if (result.error === 'API_LIMIT') {
      return status(429, { error: 'Rate limited: API call budget reached. Retry again.' })
    }

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
      move: t.String({ minLength: 2, maxLength: 10 }),
      tokensUsed: t.Optional(t.Number({ minimum: 0 })),
    }),
  })

  // --- AUTHENTICATED: Send message ---
  .post('/:matchId/message/:gameId', async ({ body, headers, params }) => {
    await database.ensureMatchLoaded(params.matchId)
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
  .get('/:matchId/messages/:gameId', async ({ headers, params }) => {
    await database.ensureMatchLoaded(params.matchId)
    const secret = engine.getMatch(params.matchId)?.secret ?? undefined
    const auth = authenticateRequest(headers, params.matchId, secret)
    if (!auth.ok) {
      return status(auth.httpStatus, { error: auth.error })
    }
    return { messages: engine.getMessages(params.matchId, params.gameId, auth.playerId) }
  })

  // --- AUTHENTICATED: Draw offer / accept / reject ---
  .post('/:matchId/draw/:gameId', async ({ headers, params }) => {
    await database.ensureMatchLoaded(params.matchId)
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

  .post('/:matchId/draw/:gameId/accept', async ({ headers, params }) => {
    await database.ensureMatchLoaded(params.matchId)
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

  .post('/:matchId/draw/:gameId/reject', async ({ headers, params }) => {
    await database.ensureMatchLoaded(params.matchId)
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
  .post('/:matchId/resign/:gameId', async ({ headers, params }) => {
    await database.ensureMatchLoaded(params.matchId)
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
  .get('/:matchId/events', async ({ params }) => {
    await database.ensureMatchLoaded(params.matchId)
    return { events: engine.getEvents(params.matchId) }
  })

  // --- PUBLIC: Metrics (spectators) ---
  .get('/:matchId/metrics', async ({ params }) => {
    await database.ensureMatchLoaded(params.matchId)
    const metrics = engine.getMatchMetrics(params.matchId)
    if (!metrics) {
      return status(404, { error: 'Match not found' })
    }
    return metrics
  })

export default matchRoutes
export { engine }
