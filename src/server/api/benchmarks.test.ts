import { describe, expect, it, beforeAll } from 'vitest'
import { Elysia } from 'elysia'
import { userAuthPlugin } from '../auth/plugin'
import userBenchmarkRoutes from './benchmarks'
import matchRoutes from './match'
import { benchmarkSummaryFromRow, database } from '../services/database'

// Full auth + user-benchmark + match surface, exercised through app.handle()
// (no server socket) exactly like the other API test suites.
const app = new Elysia()
  .use(userAuthPlugin)
  .use(userBenchmarkRoutes)
  .use(matchRoutes)

const BASE = 'http://localhost:3000'

interface SessionPayload {
  user?: { id: string; email: string; name: string }
  session?: { token: string; expiresAt: Date }
}

// Minimal cookie jar — Better Auth issues a session cookie on sign-up/sign-in.
function cookieHeader(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .filter(Boolean)
    .join('; ')
}

async function req(
  path: string,
  init: RequestInit = {},
  cookie = '',
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (cookie) headers.set('Cookie', cookie)
  return app.handle(new Request(`${BASE}${path}`, { ...init, headers }))
}

async function json<T>(res: Response): Promise<T> {
  // SAFETY: response bodies in this suite are produced by our own Elysia app
  return (await res.json()) as T
}

async function signUp(name: string, email: string): Promise<{ cookie: string; user: { id: string } }> {
  const res = await req('/api/auth/sign-up/email', {
    body: JSON.stringify({ email, name, password: 'correct-horse-battery' }),
    method: 'POST',
  })
  expect(res.status).toBe(200)
  const cookie = cookieHeader(res)
  expect(cookie).toContain('session')
  // SAFETY: response body of sign-up conforms to { user, token } shape
  const body = (await res.json()) as { user: { id: string }; token?: unknown }
  return { cookie, user: body.user }
}

async function signIn(email: string, password: string): Promise<Response> {
  return req('/api/auth/sign-in/email', {
    body: JSON.stringify({ email, password }),
    method: 'POST',
  })
}

function modelBody(userId: string) {
  return {
    matchType: 'llm_vs_llm',
    ownerId: userId, // must be ignored: ownership always comes from the session
    playerAModelId: 'MODEL-default-gpt4o',
    playerBModelId: 'MODEL-default-claude35',
  }
}

describe('User accounts (Better Auth)', () => {
  beforeAll(async () => {
    await database.clearAll()
  })

  it('registers a user and returns a session', async () => {
    const res = await req('/api/auth/sign-up/email', {
      body: JSON.stringify({ email: 'ada@example.com', name: 'Ada', password: 'correct-horse-battery' }),
      method: 'POST',
    })
    expect(res.status).toBe(200)
    expect(cookieHeader(res)).toContain('session')
  })

  it('rejects duplicate email registration', async () => {
    const res = await req('/api/auth/sign-up/email', {
      body: JSON.stringify({ email: 'ada@example.com', name: 'Ada Again', password: 'correct-horse-battery' }),
      method: 'POST',
    })
    expect(res.status).toBe(422)
  })

  it('logs in with the right password and rejects the wrong one', async () => {
    const bad = await signIn('ada@example.com', 'wrong-password')
    expect(bad.status).toBe(401)

    const ok = await signIn('ada@example.com', 'correct-horse-battery')
    expect(ok.status).toBe(200)
    expect(cookieHeader(ok)).toContain('session')
  })

  it('retrieves the session for the cookie and nulls it after logout', async () => {
    const session = await signIn('ada@example.com', 'correct-horse-battery')
    const cookie = cookieHeader(session)

    const got = await req('/api/auth/get-session', {}, cookie)
    expect(got.status).toBe(200)
    const body = await json<SessionPayload>(got)
    expect(body.user?.email).toBe('ada@example.com')
    expect(body.user?.id).toBeDefined()

    await req('/api/auth/sign-out', { method: 'POST' }, cookie)
    const after = await req('/api/auth/get-session', {}, cookie)
    // No session -> Better Auth returns a literal null body.
    const afterBody = await json<SessionPayload | null>(after)
    expect(afterBody ?? null).toBeNull()
  })

  it('rejects an invalid/expired session token', async () => {
    const res = await req('/api/benchmarks', {}, 'better-auth.session_token=forged-token')
    expect(res.status).toBe(401)
    const sessionRes = await req('/api/auth/get-session', {}, 'better-auth.session_token=forged-token')
    const body = await json<SessionPayload | null>(sessionRes)
    // No session may be derived from a forged token (Better Auth returns a
    // literal null body when the token does not resolve to a session).
    expect(body ?? null).toBeNull()
  })
})

describe('Benchmark ownership & authorization', () => {
  let ada: { cookie: string; user: { id: string } }
  let grace: { cookie: string; user: { id: string } }

  beforeAll(async () => {
    await database.clearAll()
    ada = await signUp('Ada Lovelace', 'ada.owner@example.com')
    grace = await signUp('Grace Hopper', 'grace.owner@example.com')
  })

  it('rejects anonymous access to every private benchmark endpoint', async () => {
    expect((await req('/api/benchmarks')).status).toBe(401)
    expect((await req('/api/benchmarks', { method: 'POST', body: JSON.stringify(modelBody('x')) })).status).toBe(401)
    expect((await req('/api/benchmarks/some-id')).status).toBe(401)
    expect((await req('/api/benchmarks/some-id/start', { method: 'POST' })).status).toBe(401)
    expect((await req('/api/benchmarks/some-id/cancel', { method: 'POST' })).status).toBe(401)
    expect((await req('/api/benchmarks/some-id', { method: 'DELETE' })).status).toBe(401)
  })

  it('validates configuration server-side', async () => {
    const res = await req('/api/benchmarks', {
      body: JSON.stringify({ ...modelBody(ada.user.id), timeControl: 'not-a-time-control' }),
      method: 'POST',
    }, ada.cookie)
    // Elysia/TypeBox validation responses use 422 for schema violations.
    expect(res.status).toBe(422)
  })

  it('creates an LLM vs LLM benchmark with session-derived ownership (ownerId spoof ignored)', async () => {
    const res = await req('/api/benchmarks', {
      body: JSON.stringify({
        ...modelBody('someone-elses-user-id'),
        title: 'gpt vs claude benchmark',
      }),
      method: 'POST',
    }, ada.cookie)
    expect(res.status).toBe(200)
    // SAFETY: response shape validated by our Elysia route
    const body = (await res.json()) as { benchmark: { id: string; matchType: string; status: string; title?: string; participants: { playerA: { kind: string }; playerB: { kind: string } } } }
    expect(body.benchmark.matchType).toBe('llm_vs_llm')
    expect(body.benchmark.status).toBe('created')
    expect(body.benchmark.participants.playerA.kind).toBe('model')
    expect(body.benchmark.participants.playerB.kind).toBe('model')
    expect(body.benchmark.title).toBe('gpt vs claude benchmark')

    // The spoofed ownerId in the body must not have redirected ownership:
    // Ada sees her benchmark, Grace sees nothing.
    const adaList = await req('/api/benchmarks', {}, ada.cookie)
    const adaBody = await json<{ benchmarks: { id: string }[] }>(adaList)
    expect(adaBody.benchmarks.map((b) => b.id)).toContain(body.benchmark.id)

    const graceList = await req('/api/benchmarks', {}, grace.cookie)
    const graceBody = await json<{ benchmarks: { id: string }[] }>(graceList)
    expect(graceBody.benchmarks.map((b) => b.id)).not.toContain(body.benchmark.id)
  })

  it('creates an LLM vs User benchmark bound to the authenticated user', async () => {
    const res = await req('/api/benchmarks', {
      body: JSON.stringify({
        llmModelId: 'MODEL-default-gpt4o',
        matchType: 'llm_vs_user',
        visibility: 'public',
      }),
      method: 'POST',
    }, grace.cookie)
    expect(res.status).toBe(200)
    // SAFETY: response shape validated by our Elysia route
    const body = (await res.json()) as { benchmark: { id: string; matchType: string; participants: { playerA: { kind: string; publicName: string }; playerB: { kind: string } } } }
    expect(body.benchmark.matchType).toBe('llm_vs_user')
    expect(body.benchmark.participants.playerA.kind).toBe('user')
    expect(body.benchmark.participants.playerA.publicName).toBe('Grace Hopper')
    expect(body.benchmark.participants.playerB.kind).toBe('model')
  })

  it('rejects unknown registered model ids', async () => {
    const res = await req('/api/benchmarks', {
      body: JSON.stringify({ ...modelBody(ada.user.id), playerAModelId: 'MODEL-NOT-REGISTERED' }),
      method: 'POST',
    }, ada.cookie)
    expect(res.status).toBe(400)
  })

  it('starts an LLM vs LLM benchmark into a real engine match', async () => {
    const createdRes = await req('/api/benchmarks', {
      body: JSON.stringify(modelBody(ada.user.id)),
      method: 'POST',
    }, ada.cookie)
    const created = await json<{ benchmark: { id: string } }>(createdRes)
    const id = created.benchmark.id

    const startRes = await req(`/api/benchmarks/${id}/start`, { method: 'POST' }, ada.cookie)
    expect(startRes.status).toBe(200)
    const started = await json<{
      benchmark: { status: string; matchId: string | null }
      matchId: string
      playerAId: string
      playerAToken: string
      playerBId: string
      playerBToken: string
    }>(startRes)
    expect(started.benchmark.status).toBe('running')
    expect(started.matchId).toBeDefined()
    expect(started.playerAToken).toBeDefined()
    expect(started.playerBToken).toBeDefined()

    // The engine match really exists and is playable (regression: execution intact)
    const engine = database.getEngine()
    const match = engine.getMatch(started.matchId)
    expect(match).toBeDefined()
    expect(match?.games).toHaveLength(4)
  })

  it('starts an LLM vs User benchmark; the user-side token can move', async () => {
    const createdRes = await req('/api/benchmarks', {
      body: JSON.stringify({ llmModelId: 'MODEL-default-gpt4o', matchType: 'llm_vs_user' }),
      method: 'POST',
    }, grace.cookie)
    const created = await json<{ benchmark: { id: string } }>(createdRes)
    const startRes = await req(`/api/benchmarks/${created.benchmark.id}/start`, { method: 'POST' }, grace.cookie)
    expect(startRes.status).toBe(200)
    const started = await json<{ benchmark: { matchType: string }; matchId: string; playerAId: string; playerAToken: string; gameId?: never }>(startRes)

    expect(started.benchmark.matchType).toBe('llm_vs_user')
    const matchId = started.matchId
    const engine = database.getEngine()
    const match = engine.getMatch(matchId)
    expect(match).toBeDefined()
    const gameId = match!.games[0].id

    // Grace (player A = human side, white on game 1) plays 1.e4 with the
    // token minted for her benchmark — proving the human participant is a
    // first-class engine player.
    const moveRes = await req(`/api/match/${matchId}/move/${gameId}`, {
      body: JSON.stringify({ move: 'e4' }),
      method: 'POST',
    }, '') // auth for match routes is Bearer, not cookies
    expect(moveRes.status).toBe(401)
    const moveOk = await app.handle(new Request(`${BASE}/api/match/${matchId}/move/${gameId}`, {
      body: JSON.stringify({ move: 'e4' }),
      headers: { Authorization: `Bearer ${started.playerAToken}`, 'Content-Type': 'application/json' },
      method: 'POST',
    }))
    expect(moveOk.status).toBe(200)
    const moveBody = await json<{ accepted?: boolean }>(moveOk)
    expect(moveBody.accepted).toBe(true)
  })

  it('cannot start, cancel, or delete another user\u2019s benchmark (no IDOR)', async () => {
    const createdRes = await req('/api/benchmarks', {
      body: JSON.stringify(modelBody(ada.user.id)),
      method: 'POST',
    }, ada.cookie)
    const created = await json<{ benchmark: { id: string } }>(createdRes)
    const foreignId = created.benchmark.id

    // Grace cannot even observe Ada's benchmark id
    const detail = await req(`/api/benchmarks/${foreignId}`, {}, grace.cookie)
    expect(detail.status).toBe(404)

    expect((await req(`/api/benchmarks/${foreignId}/start`, { method: 'POST' }, grace.cookie)).status).toBe(404)
    expect((await req(`/api/benchmarks/${foreignId}/cancel`, { method: 'POST' }, grace.cookie)).status).toBe(404)
    expect((await req(`/api/benchmarks/${foreignId}`, { method: 'DELETE' }, grace.cookie)).status).toBe(404)
  })

  it('owner can cancel an unstarted benchmark and delete a cancelled one', async () => {
    const createdRes = await req('/api/benchmarks', {
      body: JSON.stringify(modelBody(ada.user.id)),
      method: 'POST',
    }, ada.cookie)
    const created = await json<{ benchmark: { id: string } }>(createdRes)

    const cancelRes = await req(`/api/benchmarks/${created.benchmark.id}/cancel`, { method: 'POST' }, ada.cookie)
    expect(cancelRes.status).toBe(200)
    const cancelled = await json<{ benchmark: { status: string } }>(cancelRes)
    expect(cancelled.benchmark.status).toBe('cancelled')

    const deleteRes = await req(`/api/benchmarks/${created.benchmark.id}`, { method: 'DELETE' }, ada.cookie)
    expect(deleteRes.status).toBe(200)
  })

  it('does not delete started benchmarks (match history stays intact)', async () => {
    const createdRes = await req('/api/benchmarks', {
      body: JSON.stringify(modelBody(ada.user.id)),
      method: 'POST',
    }, ada.cookie)
    const created = await json<{ benchmark: { id: string } }>(createdRes)
    const startRes = await req(`/api/benchmarks/${created.benchmark.id}/start`, { method: 'POST' }, ada.cookie)
    expect(startRes.status).toBe(200)

    const deleteRes = await req(`/api/benchmarks/${created.benchmark.id}`, { method: 'DELETE' }, ada.cookie)
    expect(deleteRes.status).toBe(409)
  })

  it('marks a benchmark completed when its engine match completes', async () => {
    const createdRes = await req('/api/benchmarks', {
      body: JSON.stringify(modelBody(ada.user.id)),
      method: 'POST',
    }, ada.cookie)
    const created = await json<{ benchmark: { id: string } }>(createdRes)
    const startRes = await req(`/api/benchmarks/${created.benchmark.id}/start`, { method: 'POST' }, ada.cookie)
    const started = await json<{ matchId: string }>(startRes)

    // Simulate a fully played match: alternating colors mean player A is white
    // on games 1 and 3, player B white on games 2 and 4.
    const engine = database.getEngine()
    const match = engine.getMatch(started.matchId)
    expect(match).toBeDefined()
    for (const game of match!.games) {
      // White is player A on games 1+3 and player B on games 2+4, so declaring
      // a white win in every game gives player A exactly two match wins.
      game.status = 'completed'
      game.result = { reason: 'checkmate', winner: 'white' }
      game.completedAt = new Date()
      game.fenFinal = game.fenInitial
    }
    match!.status = 'completed'
    match!.completedAt = new Date()
    await database.saveMatch(match!)
    await database.saveNewEvents(started.matchId)

    const listRes = await req('/api/benchmarks', {}, ada.cookie)
    const list = await json<{ benchmarks: Array<{ id: string; status: string; result: { games: number; playerAWins: number; playerBWins: number; draws: number } }> }>(listRes)
    const done = list.benchmarks.find((b) => b.id === created.benchmark.id)
    expect(done?.status).toBe('completed')
    expect(done?.result).toEqual({ games: 4, playerAWins: 2, playerBWins: 2, draws: 0 })
  })

  it('never exposes account/session secrets in benchmark responses', async () => {
    const listRes = await req('/api/benchmarks', {}, ada.cookie)
    expect(listRes.status).toBe(200)
    const text = await listRes.text()
    expect(text).not.toContain('ada.owner@example.com')
    expect(text).not.toContain('password')
    expect(text).not.toContain('session_token')

    const detailRes = await req('/api/benchmarks', {}, ada.cookie)
    expect(detailRes.status).toBe(200)
    const detailText = await detailRes.text()
    // Serialized benchmark objects are owner-scoped summaries: no account
    // identifiers, no auth/session material.
    expect(detailText).not.toContain('ownerId')
    expect(detailText).not.toContain('email')
    expect(detailText).not.toContain('session_token')
    expect(detailText).not.toContain('password')
  })

  it('keeps the public match history working and labels user matches', async () => {
    // Pre-existing public engine match (regression: legacy history unaffected)
    const engine = database.getEngine()
    const legacy = engine.createMatch({
      boardMode: 'assisted',
      isPrivate: false,
      playerAModel: { maxOutputTokens: 4096, name: 'legacy-model-a', provider: 'openai', temperature: 0.7, version: '1.0' },
      playerBModel: { maxOutputTokens: 4096, name: 'legacy-model-b', provider: 'anthropic', temperature: 0.7, version: '1.0' },
      startingPosition: 'standard',
      timeControl: '10+5',
    })
    for (const g of legacy.games) {
      g.status = 'completed'
      g.result = { reason: 'draw_offer', winner: null }
    }
    legacy.status = 'completed'
    await database.saveMatch(legacy)

    const historyRes = await req('/api/match')
    expect(historyRes.status).toBe(200)
    const history = await json<{ matches: Array<{ id: string; matchType: string; humanName: string | null }> }>(historyRes)
    const legacyRow = history.matches.find((m) => m.id === legacy.id)
    expect(legacyRow).toBeDefined()
    expect(legacyRow?.matchType).toBe('llm_vs_llm')
    expect(legacyRow?.humanName).toBeNull()

    // A completed user LLM_VS_USER match shows its human participant publicly.
    const bmRes = await req('/api/benchmarks', {
      body: JSON.stringify({ llmModelId: 'MODEL-default-gpt4o', matchType: 'llm_vs_user' }),
      method: 'POST',
    }, grace.cookie)
    const bm = await json<{ benchmark: { id: string } }>(bmRes)
    const start = await req(`/api/benchmarks/${bm.benchmark.id}/start`, { method: 'POST' }, grace.cookie)
    const started = await json<{ matchId: string }>(start)
    const humanMatch = engine.getMatch(started.matchId)
    expect(humanMatch).toBeDefined()
    for (const g of humanMatch!.games) {
      g.status = 'completed'
      g.result = { reason: 'draw_offer', winner: null }
    }
    humanMatch!.status = 'completed'
    await database.saveMatch(humanMatch!)

    const history2 = await req('/api/match')
    const history2Body = await json<{ matches: Array<{ id: string; matchType: string; humanName: string | null }> }>(history2)
    const humanRow = history2Body.matches.find((m) => m.id === started.matchId)
    expect(humanRow).toBeDefined()
    expect(humanRow?.matchType).toBe('llm_vs_user')
    expect(humanRow?.humanName).toBe('Grace Hopper')
    expect(history2Body.matches.map((m) => m.id)).not.toContain('bogus')
  })
})

// Sanity guard against accidental removal of the public serializer helper.
describe('benchmarkSummaryFromRow helper', () => {
  it('exists and is importable', () => {
    expect(benchmarkSummaryFromRow).toBeDefined()
  })
})
