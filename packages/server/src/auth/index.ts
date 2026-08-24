import jwt from 'jsonwebtoken'
import { status } from 'elysia'

const JWT_SECRET = process.env.JWT_SECRET || 'llm-chess-arena-secret-change-in-production'

export interface PlayerToken {
  sub: string // Player ID
  match: string // Match ID
  permissions: string[]
  iat: number
  exp: number
}

export function generatePlayerToken(playerId: string, matchId: string): string {
  return jwt.sign(
    {
      match: matchId,
      permissions: ['read:state', 'write:move', 'write:message', 'read:messages'],
      sub: playerId,
    },
    JWT_SECRET,
    { expiresIn: '2h' },
  )
}

export function verifyPlayerToken(token: string): PlayerToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as PlayerToken
  } catch {
    return null
  }
}

// --- Rate Limiters ---

interface RateLimitEntry {
  count: number
  resetTime: number
}

export class RateLimiter {
  private limits = new Map<string, RateLimitEntry>()
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  check(key: string): boolean {
    const now = Date.now()
    let entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      this.limits.set(key, { count: 1, resetTime: now + this.windowMs })
      return true
    }

    if (entry.count >= this.maxRequests) {
      return false
    }

    entry.count++
    return true
  }

  reset(key: string): void {
    this.limits.delete(key)
  }
}

// 10 requests per second per player
export const rateLimiter = new RateLimiter(10, 1000)

// 20 requests per turn per player (resets on each turn change)
export const turnRateLimiter = new RateLimiter(20, 60_000)

// --- ElysiaJS Guard ---

export function authGuard() {
  return {
    as: 'scoped' as const,
    beforeHandle({ headers, params }: { headers: Record<string, string>; params: Record<string, string> }) {
      const authHeader = headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return status(401, { error: 'Unauthorized' })
      }

      const token = authHeader.slice(7)
      const payload = verifyPlayerToken(token)
      if (!payload) {
        return status(401, { error: 'Invalid token' })
      }

      // Cross-match access prevention
      if (payload.match !== params.matchId) {
        return status(403, { error: 'Forbidden' })
      }

      return { matchId: payload.match, playerId: payload.sub }
    },
  }
}
