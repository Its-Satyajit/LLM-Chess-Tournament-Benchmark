// @ts-expect-error lint requires React import
import React from "react"
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the app', () => {
    render(<App />)
    expect(screen.getByText(/LLM Chess Arena/)).toBeDefined()
  })

  it('renders navigation links', () => {
    render(<App />)
    expect(screen.getByText('Arena')).toBeDefined()
    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.getByText('Admin')).toBeDefined()
  })

  it('renders replay view when navigating to /replay/:matchId/:gameId', () => {
    window.history.pushState({}, 'Replay Test', '/replay/match-123/game-456')
    render(<App />)
    expect(screen.getByText(/Loading game\.\.\./i)).toBeDefined()
  })
})
