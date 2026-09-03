import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'llm-chess-arena-secret-change-in-production'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production')
}

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
    // SAFETY: type assertion is validated by upstream schema/parsing
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

// --- Request authentication (Story 44: tokens scoped to a single match) ---

export type AuthResult =
  | { ok: true; playerId: string }
  | { ok: false; httpStatus: 401 | 403; error: string }

export function authenticateRequest(
  headers: Record<string, string | undefined>,
  matchId: string,
): AuthResult {
  const authHeader = headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Unauthorized', httpStatus: 401, ok: false }
  }

  const payload = verifyPlayerToken(authHeader.slice(7))
  if (!payload) {
    return { error: 'Invalid token', httpStatus: 401, ok: false }
  }

  // Cross-match access prevention (Story 44)
  if (payload.match !== matchId) {
    return { error: 'Forbidden', httpStatus: 403, ok: false }
  }

  return { ok: true, playerId: payload.sub }
}
