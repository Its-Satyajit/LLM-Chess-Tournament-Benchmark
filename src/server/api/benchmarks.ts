import { Elysia, t, status } from 'elysia'
import type {
  BenchmarkConfig,
  BenchmarkParticipants,
  ModelConfig,
} from '@llm-chess-arena/shared'
import { benchmarkSummaryFromRow, database } from '../services/database'
import { auth } from '../auth/userAuth'
import { generatePlayerToken } from '../auth'

// ---------------------------------------------------------------------------
// User-owned benchmarks. Every operation below derives the owner from the
// Better Auth session (never from client input) and authorizes before acting:
//   authenticate -> identify current user -> authorize -> perform operation
// ---------------------------------------------------------------------------

const commonCreateFields = {
  boardMode: t.Optional(t.Union([t.Literal('assisted'), t.Literal('pure')])),
  startingPosition: t.Optional(t.Union([t.Literal('standard'), t.Literal('chess960')])),
  timeControl: t.Optional(t.String({ pattern: '^\\d+\\+\\d+$' })),
  title: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
  visibility: t.Optional(t.Union([t.Literal('public'), t.Literal('private')])),
}

const createBenchmarkBody = t.Union([
  t.Object({
    matchType: t.Literal('llm_vs_llm'),
    playerAModelId: t.String({ minLength: 1 }),
    playerBModelId: t.String({ minLength: 1 }),
    ...commonCreateFields,
  }),
  t.Object({
    llmModelId: t.String({ minLength: 1 }),
    matchType: t.Literal('llm_vs_user'),
    ...commonCreateFields,
  }),
])

async function sessionFor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  return session ?? null
}

function notFound() {
  // 404 (not 403) for foreign/unknown ids so benchmark ids cannot be probed.
  return status(404, { error: 'Benchmark not found' })
}

function toEngineModel(participant: BenchmarkParticipants['playerA'] | BenchmarkParticipants['playerB']): ModelConfig {
  if (participant.kind === 'model') {
    return participant.model
  }
  // A human participant is a real engine player (id/token backed) whose model
  // metadata simply labels the human side for history/manifest purposes.
  return {
    maxOutputTokens: 4096,
    name: participant.publicName,
    provider: 'user',
    temperature: 0,
    version: 'human',
  }
}

const userBenchmarkRoutes = new Elysia({ prefix: '/api/benchmarks' })
  // --- PRIVATE: Create a benchmark (config snapshot). Owner derived from the session. ---
  .post('/', async ({ body, request }) => {
    const session = await sessionFor(request)
    if (!session) {
      return status(401, { error: 'Unauthorized' })
    }

    const registry = await database.loadModels()
    // SAFETY: loadModels config comes from the models table written as JSON.stringify(ModelConfig)
    const modelById = new Map(registry.map((m) => [m.id, m.config as ModelConfig]))

    const resolveModel = (modelId: string): { model: ModelConfig; modelId: string } | null => {
      const model = modelById.get(modelId)
      return model ? { model, modelId } : null
    }

    const config: BenchmarkConfig = {
      boardMode: body.boardMode ?? 'assisted',
      isPrivate: (body.visibility ?? 'public') === 'private',
      startingPosition: body.startingPosition ?? 'standard',
      timeControl: body.timeControl ?? '10+5',
    }
    const title = body.title?.trim() || null

    if (body.matchType === 'llm_vs_llm') {
      const modelA = resolveModel(body.playerAModelId)
      const modelB = resolveModel(body.playerBModelId)
      if (!modelA || !modelB) {
        return status(400, {
          error: `Unknown model id(s): ${[!modelA && body.playerAModelId, !modelB && body.playerBModelId].filter(Boolean).join(', ')}`,
        })
      }
      const participants: BenchmarkParticipants = {
        playerA: { kind: 'model', ...modelA },
        playerB: { kind: 'model', ...modelB },
      }
      const benchmark = await database.createBenchmark({
        config,
        isPrivate: config.isPrivate,
        matchType: 'llm_vs_llm',
        ownerId: session.user.id,
        participants,
        title,
      })
      return { benchmark }
    }

    const llm = resolveModel(body.llmModelId)
    if (!llm) {
      return status(400, { error: `Unknown model id: ${body.llmModelId}` })
    }
    const participants: BenchmarkParticipants = {
      playerA: { kind: 'user', publicName: session.user.name, userId: session.user.id },
      playerB: { kind: 'model', ...llm },
    }
    const benchmark = await database.createBenchmark({
      config,
      isPrivate: config.isPrivate,
      matchType: 'llm_vs_user',
      ownerId: session.user.id,
      participants,
      title,
    })
    return { benchmark }
  }, {
    body: createBenchmarkBody,
  })

  // --- PRIVATE: List the current user's benchmarks (never the global history) ---
  .get('/', async ({ request }) => {
    const session = await sessionFor(request)
    if (!session) {
      return status(401, { error: 'Unauthorized' })
    }
    const benchmarks = await database.listBenchmarksByOwner(session.user.id)
    return { benchmarks }
  })

  // --- PRIVATE: Benchmark detail (owner only) ---
  .get('/:id', async ({ params, request }) => {
    const session = await sessionFor(request)
    if (!session) {
      return status(401, { error: 'Unauthorized' })
    }
    const row = await database.getBenchmarkRow(params.id)
    if (!row || row.ownerId !== session.user.id) {
      return notFound()
    }
    return { benchmark: benchmarkSummaryFromRow(row) }
  })

  // --- PRIVATE: Start a created benchmark: spins up the real engine match ---
  .post('/:id/start', async ({ params, request }) => {
    const session = await sessionFor(request)
    if (!session) {
      return status(401, { error: 'Unauthorized' })
    }
    const row = await database.getBenchmarkRow(params.id)
    if (!row || row.ownerId !== session.user.id) {
      return notFound()
    }
    if (row.status !== 'created') {
      return status(409, { error: `Benchmark is ${row.status}, only 'created' benchmarks can be started` })
    }

    // SAFETY: participants were validated at creation and stored as JSON.stringify(BenchmarkParticipants)
    const participants = JSON.parse(row.participants) as BenchmarkParticipants
    // SAFETY: config was validated at creation and stored as JSON.stringify(BenchmarkConfig)
    const config = JSON.parse(row.config) as BenchmarkConfig

    const engine = database.getEngine()
    const match = engine.createMatch({
      boardMode: config.boardMode,
      isPrivate: config.isPrivate,
      playerAModel: toEngineModel(participants.playerA),
      playerBModel: toEngineModel(participants.playerB),
      startingPosition: config.startingPosition,
      timeControl: config.timeControl,
    })
    await database.saveMatch(match)
    void database.saveNewEvents(match.id)
    await database.startBenchmark(row.id, match.id)

    const secret = match.secret ?? undefined
    const playerAToken = generatePlayerToken(match.playerAId, match.id, secret)
    const playerBToken = generatePlayerToken(match.playerBId, match.id, secret)

    const started = await database.getBenchmarkRow(row.id)
    if (!started) {
      return status(500, { error: 'Benchmark state could not be reloaded after start' })
    }
    return {
      benchmark: benchmarkSummaryFromRow(started),
      matchId: match.id,
      playerAId: match.playerAId,
      playerAToken,
      playerBId: match.playerBId,
      playerBToken,
    }
  })

  // --- PRIVATE: Cancel a benchmark that has not started yet ---
  .post('/:id/cancel', async ({ params, request }) => {
    const session = await sessionFor(request)
    if (!session) {
      return status(401, { error: 'Unauthorized' })
    }
    const row = await database.getBenchmarkRow(params.id)
    if (!row || row.ownerId !== session.user.id) {
      return notFound()
    }
    if (row.status !== 'created') {
      return status(409, { error: `Benchmark is ${row.status}, only 'created' benchmarks can be cancelled` })
    }
    await database.setBenchmarkStatus(row.id, 'cancelled')
    const updated = await database.getBenchmarkRow(row.id)
    if (!updated) {
      return status(500, { error: 'Benchmark state could not be reloaded after cancel' })
    }
    return { benchmark: benchmarkSummaryFromRow(updated) }
  })

  // --- PRIVATE: Delete an unstarted benchmark (started/completed matches stay intact) ---
  .delete('/:id', async ({ params, request }) => {
    const session = await sessionFor(request)
    if (!session) {
      return status(401, { error: 'Unauthorized' })
    }
    const row = await database.getBenchmarkRow(params.id)
    if (!row || row.ownerId !== session.user.id) {
      return notFound()
    }
    if (row.status === 'running' || row.status === 'completed') {
      return status(409, {
        error: 'Started benchmarks cannot be deleted — their match belongs to public history',
      })
    }
    await database.deleteBenchmark(row.id)
    return { success: true }
  })

export default userBenchmarkRoutes
