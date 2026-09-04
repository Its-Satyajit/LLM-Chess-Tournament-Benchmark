import { describe, expect, it } from 'vitest'
import { Elysia } from 'elysia'
import { benchmarkRoutes } from './benchmark'
import { database } from '../services/database'

const app = new Elysia().use(benchmarkRoutes)

describe('Benchmark and Game Review Endpoints', () => {
  it('GET /api/benchmark — returns benchmark matrix', async () => {
    const res = await app.handle(new Request('http://localhost/api/benchmark'))
    expect(res.status).toBe(200)
    // SAFETY: Response is JSON produced by Elysia benchmark route
    const data = (await res.json()) as { models: Array<unknown>; totalMatches: number }
    expect(Array.isArray(data.models)).toBe(true)
    expect(typeof data.totalMatches).toBe('number')
  })

  it('GET /api/game/:gameId/review — returns 404 for missing review', async () => {
    const res = await app.handle(new Request('http://localhost/api/game/non-existent-game-id/review'))
    expect(res.status).toBe(404)
  })

  it('POST /api/game/:gameId/review — saves and retrieves game review', async () => {
    // First create a match and game in DB so foreign key constraint is satisfied
    const engine = database.getEngine()
    const match = engine.createMatch({
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: '1.0' },
      playerBModel: { maxOutputTokens: 4096, name: 'claude-3', provider: 'anthropic', temperature: 0.7, version: '1.0' },
      startingPosition: 'standard',
      timeControl: '10+5',
    })
    await database.saveMatch(match)
    const testGame = match.games[0]

    const reviewPayload = {
      blackAccuracy: 84.5,
      blackRating: 1850,
      classificationCounts: {
        black: { best: 5, blunder: 1, brilliant: 0, excellent: 4, good: 2, inaccuracy: 1, miss: 0, mistake: 1 },
        white: { best: 8, blunder: 0, brilliant: 1, excellent: 3, good: 2, inaccuracy: 0, miss: 0, mistake: 0 },
      },
      depth: 16,
      id: `rev-${testGame.id}`,
      matchId: match.id,
      plies: [
        { centipawns: 25, classification: 'best', move: 'e4', ply: 1, winProbability: 51 },
      ],
      whiteAccuracy: 92.3,
      whiteRating: 2050,
    }

    const postRes = await app.handle(
      new Request(`http://localhost/api/game/${testGame.id}/review`, {
        body: JSON.stringify(reviewPayload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    )
    expect(postRes.status).toBe(200)

    // Retrieve review
    const getRes = await app.handle(new Request(`http://localhost/api/game/${testGame.id}/review`))
    expect(getRes.status).toBe(200)
    // SAFETY: Response is JSON matching saved review structure
    const retrieved = (await getRes.json()) as { whiteAccuracy: number; blackAccuracy: number }
    expect(retrieved.whiteAccuracy).toBe(92.3)
    expect(retrieved.blackAccuracy).toBe(84.5)
  })
})
