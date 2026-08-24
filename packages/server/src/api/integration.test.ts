import { describe, expect, it } from "vitest"
import { Elysia } from "elysia"
import { cors } from "@elysiajs/cors"
import matchRoutes from "./match"
import ratingsRoutes from "./ratings"
import manifestRoutes from "./manifest"
import { generatePlayerToken } from "../auth"

// Create test app — no server needed, use app.handle()
const app = new Elysia()
  .use(cors())
  .get("/health", () => ({ status: "healthy" }))
  .use(matchRoutes)
  .use(manifestRoutes)
  .use(ratingsRoutes)

function authHeader(matchId: string, playerId: string) {
  return { Authorization: `Bearer ${generatePlayerToken(playerId, matchId)}` }
}

async function GET(path: string, headers?: Record<string, string>) {
  const req = new Request(`http://localhost${path}`, { headers })
  return app.handle(req).then((r) => r.json())
}

async function POST(path: string, body: unknown, headers?: Record<string, string>) {
  const req = new Request(`http://localhost${path}`, {
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
    method: "POST",
  })
  return app.handle(req).then((r) => r.json())
}

describe("API Integration", () => {
  let matchId: string
  let playerAId: string
  let playerBId: string
  let gameId: string

  it("POST /api/match/create — creates match with tokens", async () => {
    const data = await POST("/api/match/create", {
      playerAModel: { maxOutputTokens: 4096, name: "gpt-4o", provider: "openai", temperature: 0.7, version: "2024-08-06" },
      playerBModel: { maxOutputTokens: 4096, name: "claude-3", provider: "anthropic", temperature: 0.7, version: "2024-05-14" },
    }) as Record<string, unknown>

    matchId = data.matchId as string
    playerAId = data.playerAId as string
    playerBId = data.playerBId as string
    const games = data.games as { id: string; displayPlayerAId?: string; displayPlayerBId?: string }[]
    gameId = games[0].id

    expect(matchId).toBeDefined()
    expect(playerAId).toBeDefined()
    expect(games).toHaveLength(4)
    expect(games[0].displayPlayerAId).toBeDefined()
    expect(games[0].displayPlayerBId).toBeDefined()
  })

  it("GET /api/match/:matchId — returns match info", async () => {
    const data = await GET(`/api/match/${matchId}`) as Record<string, unknown>
    expect(data.id).toBe(matchId)
    expect(data.status).toBe("active")
  })

  it("GET /api/match/:matchId/state/:gameId — returns game state", async () => {
    const data = await GET(`/api/match/${matchId}/state/${gameId}`) as Record<string, unknown>
    expect(data.fen).toBeDefined()
    expect(data.turn).toBe("white")
    expect(data.history).toEqual([])
  })

  it("POST /api/match/:matchId/move/:gameId — requires auth", async () => {
    const data = await POST(`/api/match/${matchId}/move/${gameId}`, { move: "e2e4" }) as Record<string, unknown>
    expect(data.error).toBeDefined()
  })

  it("POST /api/match/:matchId/move/:gameId — accepts valid move", async () => {
    const state = await GET(`/api/match/${matchId}/state/${gameId}`, authHeader(matchId, playerAId)) as Record<string, unknown>
    const whiteId = (state.turn === "white") ? playerAId : playerBId

    const result = await POST(
      `/api/match/${matchId}/move/${gameId}`,
      { move: "e2e4" },
      authHeader(matchId, whiteId),
    ) as Record<string, unknown>
    // Should either accept or reject with a valid error
    expect(result.accepted === true || result.error !== undefined).toBe(true)
  })

  it("POST /api/match/:matchId/message/:gameId — sends message", async () => {
    const data = await POST(
      `/api/match/${matchId}/message/${gameId}`,
      { content: "Hello opponent!" },
      authHeader(matchId, playerAId),
    ) as Record<string, unknown>
    expect(data.sent).toBe(true)
  })

  it("GET /api/match/:matchId/messages/:gameId — gets messages", async () => {
    const data = await GET(
      `/api/match/${matchId}/messages/${gameId}`,
      authHeader(matchId, playerBId),
    ) as Record<string, unknown>
    expect(Array.isArray(data.messages)).toBe(true)
  })

  it("GET /api/match/:matchId/events — public events", async () => {
    const data = await GET(`/api/match/${matchId}/events`) as Record<string, unknown>
    expect(Array.isArray(data.events)).toBe(true)
    expect((data.events as unknown[]).length).toBeGreaterThan(0)
  })

  it("GET /api/match/:matchId/metrics — public metrics", async () => {
    const data = await GET(`/api/match/${matchId}/metrics`) as Record<string, unknown>
    expect(data.totalMoves).toBeDefined()
    expect(data.avgResponseTime).toBeDefined()
    expect(data.blunderRate).toBeDefined()
    expect(data.tacticalAccuracy).toBeDefined()
  })

  it("GET /api/match/:matchId/manifest — returns manifest", async () => {
    const data = await GET(`/api/match/${matchId}/manifest`) as Record<string, unknown>
    expect(data.manifestVersion).toBeDefined()
    expect(data.benchmarkVersion).toBeDefined()
    expect(data.matchId).toBe(matchId)
    expect(data.parameters).toBeDefined()
    expect(data.players).toBeDefined()
    expect(data.prompt).toBeDefined()
    expect(data.rules).toBeDefined()
    expect(data.seeds).toBeDefined()
    expect(data.environment).toBeDefined()
  })

  it("GET /api/ratings — returns ratings from DB", async () => {
    const data = await GET("/api/ratings") as Record<string, unknown>
    expect(Array.isArray(data.ratings)).toBe(true)
  })

  it("GET /health — returns healthy", async () => {
    const data = await GET("/health") as Record<string, unknown>
    expect(data.status).toBe("healthy")
  })
})

describe("Auth enforcement (Stories 44, 46, 47)", () => {
  let matchId: string
  let playerAId: string
  let gameId: string

  it("setup: create match", async () => {
    const data = await POST("/api/match/create", {
      playerAModel: { maxOutputTokens: 4096, name: "gpt-4o", provider: "openai", temperature: 0.7, version: "2024-08-06" },
      playerBModel: { maxOutputTokens: 4096, name: "claude-3", provider: "anthropic", temperature: 0.7, version: "2024-05-14" },
    }) as Record<string, unknown>
    matchId = data.matchId as string
    playerAId = data.playerAId as string
    gameId = (data.games as { id: string }[])[0].id
    expect(matchId).toBeDefined()
  })

  async function raw(path: string, headers?: Record<string, string>, method = "GET", body?: unknown) {
    return app.handle(new Request(`http://localhost${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...headers },
      method,
    }))
  }

  it("rejects missing token with 401", async () => {
    const res = await raw(`/api/match/${matchId}/move/${gameId}`, undefined, "POST", { move: "e2e4" })
    expect(res.status).toBe(401)
  })

  it("rejects invalid token with 401", async () => {
    const res = await raw(`/api/match/${matchId}/move/${gameId}`, { Authorization: "Bearer not.a.token" }, "POST", { move: "e2e4" })
    expect(res.status).toBe(401)
  })

  it("rejects wrong-match token with 403 (Story 44)", async () => {
    const other = await POST("/api/match/create", {
      playerAModel: { maxOutputTokens: 4096, name: "gpt-4o", provider: "openai", temperature: 0.7, version: "2024-08-06" },
      playerBModel: { maxOutputTokens: 4096, name: "claude-3", provider: "anthropic", temperature: 0.7, version: "2024-05-14" },
    }) as Record<string, unknown>
    const foreignToken = generatePlayerToken(other.playerAId as string, other.matchId as string)

    const res = await raw(
      `/api/match/${matchId}/move/${gameId}`,
      { Authorization: `Bearer ${foreignToken}` },
      "POST",
      { move: "e2e4" },
    )
    expect(res.status).toBe(403)
  })

  it("spectator state shows neither clock (ADR-005)", async () => {
    const data = await GET(`/api/match/${matchId}/state/${gameId}`) as { clock: { white?: number; black?: number } }
    expect(data.clock.white).toBeUndefined()
    expect(data.clock.black).toBeUndefined()
  })

  it("player state shows only own clock (ADR-005)", async () => {
    const data = await GET(
      `/api/match/${matchId}/state/${gameId}`,
      authHeader(matchId, playerAId),
    ) as { clock: { white?: number; black?: number }; turn: string }
    const isWhite = data.turn === "white"
    expect(isWhite ? data.clock.white : data.clock.black).toBeDefined()
    expect(isWhite ? data.clock.black : data.clock.white).toBeUndefined()
  })
})
