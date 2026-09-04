// @vitest-environment jsdom
import '../../test/setup'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LlmPromptCard from './LlmPromptCard'
import type { Match } from '../../lib/api'

const mockTokens = { black: 'token-black-123', white: 'token-white-123' }

const mockMatch: Match = {
  currentGameIndex: 0,
  games: [
    {
      displayPlayerAId: 'model-a',
      displayPlayerBId: 'model-b',
      gameNumber: 1,
      id: 'game-1',
      moveCount: 0,
      result: null,
      status: 'active',
      whitePlayerId: 'p-white',
    },
  ],
  id: 'match-1',
  playerAId: 'p-white',
  playerBId: 'p-black',
  status: 'active',
}

describe('LlmPromptCard Component', () => {
  it('renders LLM Prompt card and expands preview with Swagger banter instructions', () => {
    render(
      <LlmPromptCard
        activeGameId="game-1"
        apiUrl="http://localhost:3001"
        matchInfo={mockMatch}
        tokens={mockTokens}
      />,
    )

    expect(screen.getByText(/LLM Prompt/i)).toBeInTheDocument()

    const previewBtn = screen.getByRole('button', { name: /preview/i })
    fireEvent.click(previewBtn)

    const promptPre = document.querySelector('pre')
    expect(promptPre).not.toBeNull()
    expect(promptPre?.textContent).toContain('Tactical Grandmaster Swagger')
    expect(promptPre?.textContent).toContain('skills/chess-arena-player')
    expect(promptPre?.textContent).toContain('arena.mjs')
    expect(promptPre?.textContent).toMatch(/compliment/i)
    expect(promptPre?.textContent).toMatch(/roast|trash/i)
  })
})
