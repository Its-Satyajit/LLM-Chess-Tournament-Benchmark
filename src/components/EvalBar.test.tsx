// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import EvalBar from './EvalBar'

describe('EvalBar', () => {
  it('renders neutral evaluation around 0.0', () => {
    render(<EvalBar centipawns={0} />)
    expect(screen.getByText('0.0')).toBeInTheDocument()
  })

  it('renders positive evaluation for white advantage', () => {
    render(<EvalBar centipawns={150} />)
    expect(screen.getByText('+1.5')).toBeInTheDocument()
  })

  it('renders negative evaluation for black advantage', () => {
    render(<EvalBar centipawns={-240} />)
    expect(screen.getByText('-2.4')).toBeInTheDocument()
  })

  it('renders mate score when applicable', () => {
    render(<EvalBar centipawns={10000} isMate={true} mateIn={2} />)
    expect(screen.getByText('M2')).toBeInTheDocument()
  })
})
