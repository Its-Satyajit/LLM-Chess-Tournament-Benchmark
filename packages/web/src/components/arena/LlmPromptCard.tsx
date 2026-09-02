import { useState, useEffect } from 'react'
import type { Match } from '../../lib/api'

// Mirrors packages/server/src/prompt/index.ts (ADR-006 canonical template).
// Keep in sync — the server version is the source of truth (PROMPT_VERSION v2.0).
const PROMPT_TEMPLATE = `You are an AI chess engine competing in a benchmark tournament.

## Match setup
- Benchmark: LLM Chess Arena — two AI models play a 4-game match.
- Your opponent is another AI model. Colors swap each game.
- You are playing the {COLOR} pieces in this game.
- {COLOR_NOTE}

## Your identity
- Player ID: {PLAYER_ID}
- Time control: {TIME_CONTROL} (base + increment per move)
- API base: {API_URL}
- Full API reference: {API_URL}/llms-all.txt — read it before your first call; it documents every endpoint, auth headers, budgets, and error codes

## Credentials
Your access token is provided together with this prompt:

    Authorization: Bearer {TOKEN}

Send that header on EVERY request. The token is scoped to this match only.
If you were not given a token, ask the operator — you cannot play without it.

## Your turn protocol (follow every turn)
1. Call GET_STATE() — never assume the board position.
2. Review "legalMoves" (assisted mode) and pick your move.
3. Call MAKE_MOVE with your move in Standard Algebraic Notation.
4. Stop. Wait for your opponent. You are only prompted when it is your turn.

## Moves
- Use Standard Algebraic Notation: "e4", "Nf3", "O-O" (castling), "exd5" (capture), "e8=Q" (promotion), "Qxf7#" (checkmate suffix optional).
- The server validates every move. Illegal moves are rejected and cost clock time — re-check the position and retry.

## Tools
- GET_STATE() — board FEN, move history, turn, your clock, legal moves, draw-offer status.
- MAKE_MOVE(move) — submit your move, e.g. MAKE_MOVE("Nf3").
- SEND_MESSAGE(content) — send text to your opponent.
- GET_MESSAGES() — read your opponent's messages.
- DRAW_OFFER() — offer a draw; takes effect only if your opponent accepts.
- DRAW_ACCEPT() / DRAW_REJECT() — respond to a pending draw offer (check GET_STATE for one).
- RESIGN() — resign immediately. Irreversible.

## Rules
- The server is authoritative. The board is only ever what GET_STATE reports.
- Only move when it is your turn. Moves out of turn are rejected.
- Each tool call consumes time from your clock. The clock runs while the server processes your requests.

## Budgets
- API calls: limited per turn and per game. Exceeding either forfeits the game.
- Output tokens: limited per move and per game. Exceeding either forfeits the game.
- Be decisive: one GET_STATE, one MAKE_MOVE is a complete, efficient turn.

## Communication
- You may message your opponent at any time without losing the right to move.
- Messages never affect the game state. Bluffing and psychological play are allowed.
- Draw offers require your opponent's explicit acceptance.

## Objective
Win the game. If winning is impossible, steer toward a draw rather than losing.`

const COLOR_NOTES: Record<'white' | 'black', string> = {
  white: 'You move FIRST. Open the game.',
  black: 'Your opponent moves FIRST. Respond to their opening.',
}

export interface LlmPromptCardProps {
  matchInfo: Match | null
  activeGameId: string
  apiUrl: string
}

export default function LlmPromptCard({
  matchInfo,
  activeGameId,
  apiUrl,
}: LlmPromptCardProps) {
  const [promptSide, setPromptSide] = useState<'white' | 'black'>('white')
  const [showPrompt, setShowPrompt] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [tokenA, setTokenA] = useState('')
  const [tokenB, setTokenB] = useState('')
  const timeControl = '10+5'

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = setTimeout(() => setCopyState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [copyState])

  const activeGame = matchInfo?.games.find((g) => g.id === activeGameId)

  // Auto-sync default prompt side to player A's color for the current game
  useEffect(() => {
    if (activeGame && matchInfo) {
      setPromptSide(activeGame.whitePlayerId === matchInfo.playerAId ? 'white' : 'black')
    }
  }, [activeGame, matchInfo])

  const getPromptFor = (side: 'white' | 'black') => {
    const sideIsPlayerA = activeGame
      ? (side === 'white') === (activeGame.whitePlayerId === matchInfo?.playerAId)
      : side === 'white'
    const playerIdForSide = sideIsPlayerA ? matchInfo?.playerAId : matchInfo?.playerBId
    const displayId = sideIsPlayerA ? activeGame?.displayPlayerAId : activeGame?.displayPlayerBId
    return PROMPT_TEMPLATE
      .replace('{PLAYER_ID}', displayId || playerIdForSide || `player-${side}`)
      .replace(/\{COLOR_NOTE\}/g, COLOR_NOTES[side])
      .replace(/\{COLOR\}/g, side)
      .replace('{TIME_CONTROL}', timeControl)
      .replace(/\{API_URL\}/g, apiUrl)
      .replace('{TOKEN}', (sideIsPlayerA ? tokenA : tokenB) || '<token-provided-separately>')
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(getPromptFor(promptSide))
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  const whitePlayerLabel = activeGame?.whitePlayerId === matchInfo?.playerAId
    ? activeGame?.displayPlayerAId || 'Player A'
    : activeGame?.displayPlayerBId || 'Player B'

  const blackPlayerLabel = activeGame?.whitePlayerId === matchInfo?.playerAId
    ? activeGame?.displayPlayerBId || 'Player B'
    : activeGame?.displayPlayerAId || 'Player A'

  return (
    <article className="card">
      <header>
        <strong>LLM Prompt</strong>
        <button
          className="button"
          data-variant="secondary"
          onClick={() => setShowPrompt(!showPrompt)}
          aria-expanded={showPrompt}
          style={{ float: 'right' }}
        >
          {showPrompt ? 'Hide' : 'Show'}
        </button>
        <button className="button" onClick={copyPrompt} aria-live="polite" style={{ float: 'right' }}>
          Copy
        </button>
      </header>

      <fieldset role="radiogroup" aria-label="Prompt side">
        <label style={{ marginRight: '1rem' }}>
          <input
            type="radio"
            name="prompt-side"
            checked={promptSide === 'white'}
            onChange={() => setPromptSide('white')}
          />{' '}
          White — {whitePlayerLabel}
        </label>
        <label>
          <input
            type="radio"
            name="prompt-side"
            checked={promptSide === 'black'}
            onChange={() => setPromptSide('black')}
          />{' '}
          Black — {blackPlayerLabel}
        </label>
      </fieldset>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <label>
          <small>Player A token (Bearer)</small>
          <input
            type="password"
            placeholder="paste playerAToken"
            value={tokenA}
            onChange={(e) => setTokenA(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label>
          <small>Player B token (Bearer)</small>
          <input
            type="password"
            placeholder="paste playerBToken"
            value={tokenB}
            onChange={(e) => setTokenB(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>

      {copyState !== 'idle' && (
        <p role="status">
          <span className="badge" data-variant={copyState === 'copied' ? 'success' : 'danger'}>
            {copyState === 'copied'
              ? 'Prompt copied to clipboard.'
              : 'Copy failed — clipboard unavailable. Use "Show" and select manually.'}
          </span>
        </p>
      )}

      {showPrompt && (
        <pre style={{ whiteSpace: 'pre-wrap', maxHeight: '16rem', overflow: 'auto' }}>
          {getPromptFor(promptSide)}
        </pre>
      )}

      {!showPrompt && (
        <p><small>Click "Show" to see the prompt for your LLM, or "Copy" to copy it directly.</small></p>
      )}
    </article>
  )
}
