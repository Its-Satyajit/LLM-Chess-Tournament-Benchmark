import { describe, it, expect } from 'vitest'
import {
  PROMPT_VERSION,
  getPromptHash,
  getPromptTemplate,
  formatPrompt,
} from './index'

describe('Server Player Prompt (v2.1)', () => {
  it('exposes bumped prompt version v2.1', () => {
    expect(PROMPT_VERSION).toBe('v2.1')
  })

  it('generates a valid 64-character sha256 hash', () => {
    const hash = getPromptHash()
    expect(hash).toHaveLength(64)
    expect(/^[a-f0-9]{64}$/.test(hash)).toBe(true)
  })

  it('includes Tactical Grandmaster Swagger banter instructions in the template', () => {
    const template = getPromptTemplate()
    // Banter & personality
    expect(template).toContain('Tactical Grandmaster Swagger')
    expect(template).toContain('SEND_MESSAGE')
    expect(template).toMatch(/compliment/i)
    expect(template).toMatch(/roast|trash/i)
    // Budget guardrails
    expect(template).toContain('1 message per turn')
    expect(template).toContain('25 words')
  })

  it('includes skills/chess-arena-player CLI tooling instructions', () => {
    const template = getPromptTemplate()
    expect(template).toContain('skills/chess-arena-player')
    expect(template).toContain('node arena.mjs get-state')
    expect(template).toContain('node arena.mjs make-move')
    expect(template).toContain('node arena.mjs send-message')
    expect(template).toContain('node arena.mjs wait-turn')
  })

  it('formats prompt with player variables correctly', () => {
    const formatted = formatPrompt({
      apiUrl: 'http://localhost:3001',
      color: 'white',
      gameId: 'GAME-1',
      matchId: 'MATCH-1',
      playerId: 'P-TEST123',
      timeControl: '10+5',
    })

    expect(formatted).toContain('Player ID: P-TEST123')
    expect(formatted).toContain('white')
    expect(formatted).toContain('10+5')
    expect(formatted).toContain('http://localhost:3001')
    // Token is self-served from the DB token endpoint, never embedded
    expect(formatted).toContain('http://localhost:3001/api/match/MATCH-1/token/P-TEST123')
    expect(formatted).not.toContain('{PLAYER_ID}')
    expect(formatted).not.toContain('{TOKEN}')
    expect(formatted).not.toContain('Bearer jwt-token-xyz')
  })
})
