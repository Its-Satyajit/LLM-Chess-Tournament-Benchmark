import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { app } from '@/app/api/[[...slugs]]/route'
import { getRatings, createMatch, getMatch } from './api'
import type { ModelConfig } from '@llm-chess-arena/shared'

describe('API facade via Eden Treaty', () => {
  const originalFetch = globalThis.fetch

  beforeAll(() => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const req = new Request(input, init)
      if (req.url.startsWith('http://localhost:3000')) {
        return app.fetch(req)
      }
      return originalFetch(input, init)
    }
  })

  afterAll(() => {
    globalThis.fetch = originalFetch
  })

  it('should fetch ratings with getRatings', async () => {
    const result = await getRatings()
    expect(result).toHaveProperty('ratings')
    expect(Array.isArray(result.ratings)).toBe(true)
  })

  it('should create a match and get its details', async () => {
    const modelA: ModelConfig = {
      maxOutputTokens: 1000,
      name: 'model-a',
      provider: 'test',
      temperature: 0.7,
      version: '1.0',
    }
    const modelB: ModelConfig = {
      maxOutputTokens: 1000,
      name: 'model-b',
      provider: 'test',
      temperature: 0.7,
      version: '1.0',
    }

    const created = await createMatch(modelA, modelB)
    expect(created.matchId).toBeDefined()
    expect(created.playerAId).toBeDefined()
    expect(created.playerBId).toBeDefined()
    expect(created.games.length).toBeGreaterThan(0)

    const fetched = await getMatch(created.matchId)
    expect(fetched.id).toBe(created.matchId)
    expect(fetched.games.length).toBeGreaterThan(0)
  })
})
