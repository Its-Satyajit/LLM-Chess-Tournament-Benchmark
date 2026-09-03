import { describe, expect, it } from 'vitest'
import { app, GET, POST } from './[[...slugs]]/route'

describe('Next.js Elysia Route Handler', () => {
  it('should export app and HTTP method handlers', () => {
    expect(app).toBeDefined()
    expect(GET).toBeInstanceOf(Function)
    expect(POST).toBeInstanceOf(Function)
  })

  it('should handle GET /api/health', async () => {
    const req = new Request('http://localhost:3000/api/health')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ status: 'healthy' })
  })

  it('should handle GET /api/ratings', async () => {
    const req = new Request('http://localhost:3000/api/ratings')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('ratings')
    expect(Array.isArray(json.ratings)).toBe(true)
  })
})
