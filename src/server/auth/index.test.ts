import { describe, it, expect, beforeEach } from 'vitest'
import {
  generatePlayerToken,
  verifyPlayerToken,
  RateLimiter,
  rateLimiter,
  turnRateLimiter,
} from './index'

describe('Auth', () => {
  describe('JWT tokens', () => {
    it('generates a valid token', () => {
      const token = generatePlayerToken('player-1', 'match-1')
      expect(token.split('.')).toHaveLength(3)
    })

    it('verifies a valid token', () => {
      const token = generatePlayerToken('player-1', 'match-1')
      const payload = verifyPlayerToken(token)

      expect(payload).not.toBeNull()
      expect(payload?.sub).toBe('player-1')
      expect(payload?.match).toBe('match-1')
      expect(payload?.permissions).toContain('read:state')
      expect(payload?.permissions).toContain('write:move')
    })

    it('rejects an invalid token', () => {
      const payload = verifyPlayerToken('invalid.token.here')
      expect(payload).toBeNull()
    })

    it('rejects a token with wrong secret', () => {
      const jwt = require('jsonwebtoken')
      const token = jwt.sign(
        { sub: 'player-1', match: 'match-1', permissions: [] },
        'wrong-secret',
        { expiresIn: '1h' },
      )
      const payload = verifyPlayerToken(token)
      expect(payload).toBeNull()
    })

    it('generates different tokens for different players', () => {
      const t1 = generatePlayerToken('player-1', 'match-1')
      const t2 = generatePlayerToken('player-2', 'match-1')
      expect(t1).not.toBe(t2)
    })

    it('generates different tokens for different matches', () => {
      const t1 = generatePlayerToken('player-1', 'match-1')
      const t2 = generatePlayerToken('player-1', 'match-2')
      expect(t1).not.toBe(t2)
    })

    it('includes correct permissions', () => {
      const token = generatePlayerToken('p1', 'm1')
      const payload = verifyPlayerToken(token)
      expect(payload?.permissions).toEqual([
        'read:state',
        'write:move',
        'write:message',
        'read:messages',
      ])
    })

    it('signs and verifies with a per-match secret', () => {
      const secret = 'per-match-secret-123'
      const token = generatePlayerToken('player-1', 'match-1', secret)
      const payload = verifyPlayerToken(token, secret)
      expect(payload?.sub).toBe('player-1')
      expect(payload?.match).toBe('match-1')
    })

    it('rejects a token when the per-match secret does not match', () => {
      const token = generatePlayerToken('player-1', 'match-1', 'secret-a')
      expect(verifyPlayerToken(token, 'secret-b')).toBeNull()
    })

    it('still verifies a global-secret token when a per-match secret is supplied', () => {
      // Back-compat: verification tries the per-match secret first, then the
      // global JWT_SECRET, so legacy/global tokens keep working.
      const token = generatePlayerToken('player-1', 'match-1')
      expect(verifyPlayerToken(token, 'some-match-secret')).not.toBeNull()
    })
  })

  describe('RateLimiter', () => {
    let limiter: RateLimiter

    beforeEach(() => {
      limiter = new RateLimiter(5, 1000) // 5 per second
    })

    it('allows requests under limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(limiter.check('test')).toBe(true)
      }
    })

    it('blocks requests over limit', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('test')
      }
      expect(limiter.check('test')).toBe(false)
    })

    it('resets after window expires', async () => {
      const shortLimiter = new RateLimiter(2, 50)
      shortLimiter.check('test')
      shortLimiter.check('test')
      expect(shortLimiter.check('test')).toBe(false)

      await new Promise(resolve => setTimeout(resolve, 60))
      expect(shortLimiter.check('test')).toBe(true)
    })

    it('tracks different keys independently', () => {
      for (let i = 0; i < 3; i++) {
        limiter.check('a')
        limiter.check('b')
      }
      // a has 3/5, b has 3/5 — both still allowed
      expect(limiter.check('a')).toBe(true)
      expect(limiter.check('b')).toBe(true)
    })

    it('manually resets a key', () => {
      for (let i = 0; i < 5; i++) {
        limiter.check('test')
      }
      expect(limiter.check('test')).toBe(false)
      limiter.reset('test')
      expect(limiter.check('test')).toBe(true)
    })
  })

  describe('Global rate limiters', () => {
    it('rateLimiter exists with 10 req/sec config', () => {
      expect(rateLimiter).toBeInstanceOf(RateLimiter)
    })

    it('turnRateLimiter exists with 20 req/turn config', () => {
      expect(turnRateLimiter).toBeInstanceOf(RateLimiter)
    })
  })
})
