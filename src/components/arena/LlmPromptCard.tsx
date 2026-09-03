import { useState, useEffect, useCallback, type ChangeEvent } from 'react'
import { Copy, Check, Circle } from 'lucide-react'
import type { Match } from '../../lib/api'

const PROMPT_TEMPLATE = `You are a chess engine playing as {PLAYER_ID}.
You are playing {COLOR}. {COLOR_NOTE}
Time control: {TIME_CONTROL}.

## Rules
- Standard chess rules apply.
- Moves are submitted in SAN (Standard Algebraic Notation), e.g. "e4", "Nf3", "O-O", "exd5".
- Invalid moves result in immediate forfeit.
- You must manage your clock. If your time expires, you lose on time.

## Available Tools
1. GET_STATE - fetch the current board state, FEN, clocks, and legal moves.
2. MAKE_MOVE - submit your move in SAN.
3. SEND_MESSAGE - send a chat message to your opponent (optional, doesn't consume move).
4. OFFER_DRAW - offer a draw to your opponent.
5. RESIGN - resign the game.

## API Details
- Base URL: {API_URL}
- Auth header: Authorization: Bearer {TOKEN}
- All requests must include the Bearer token.

## Strategy & Play Style
- Always call GET_STATE first to understand the current position.
- Choose the strongest move based on the position.
- Balance calculation depth against clock time.
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

const COLOR_NOTES = {
  black: 'Your opponent moves FIRST. Respond to their opening.',
  white: 'You move FIRST. Open the game.',
} as const satisfies Record<'white' | 'black', string>

export interface LlmPromptCardProps {
  matchInfo: Match | null
  activeGameId: string
  apiUrl: string
  tokens?: { white: string; black: string } | null
}

export default function LlmPromptCard({
  matchInfo,
  activeGameId,
  apiUrl,
  tokens,
}: LlmPromptCardProps) {
  const [userSide, setUserSide] = useState<{ gameId: string; side: 'white' | 'black' } | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [tokenA, setTokenA] = useState('')
  const [tokenB, setTokenB] = useState('')
  const timeControl = '10+5'

  const activeGame = matchInfo?.games.find((g) => g.id === activeGameId)
  const defaultSide: 'white' | 'black' =
    activeGame && matchInfo && activeGame.whitePlayerId === matchInfo.playerAId ? 'white' : 'black'
  const promptSide = userSide && userSide.gameId === activeGameId ? userSide.side : defaultSide

  const currentTokenA = tokenA || tokens?.white || ''
  const currentTokenB = tokenB || tokens?.black || ''

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = setTimeout(() => setCopyState('idle'), 2000)
    return () => clearTimeout(timer)
  }, [copyState])

  const getPromptFor = useCallback(
    (side: 'white' | 'black') => {
      const sideIsPlayerA = activeGame
        ? (side === 'white') === (activeGame.whitePlayerId === matchInfo?.playerAId)
        : side === 'white'
      const playerIdForSide = sideIsPlayerA ? matchInfo?.playerAId : matchInfo?.playerBId
      const displayId = sideIsPlayerA ? activeGame?.displayPlayerAId : activeGame?.displayPlayerBId
      return PROMPT_TEMPLATE
        .replace('{PLAYER_ID}', displayId || playerIdForSide || `player-${side}`)
        .replaceAll('{COLOR_NOTE}', COLOR_NOTES[side])
        .replaceAll('{COLOR}', side)
        .replace('{TIME_CONTROL}', timeControl)
        .replaceAll('{API_URL}', apiUrl)
        .replace('{TOKEN}', (sideIsPlayerA ? currentTokenA : currentTokenB) || '<token-provided-separately>')
    },
    [activeGame, matchInfo, timeControl, apiUrl, currentTokenA, currentTokenB],
  )

  const copyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getPromptFor(promptSide))
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }, [getPromptFor, promptSide])

  const handleToggleShow = useCallback(() => {
    setShowPrompt((prev) => !prev)
  }, [])

  const handleSelectWhite = useCallback(() => {
    setUserSide({ gameId: activeGameId, side: 'white' })
  }, [activeGameId])

  const handleSelectBlack = useCallback(() => {
    setUserSide({ gameId: activeGameId, side: 'black' })
  }, [activeGameId])

  const handleTokenAChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTokenA(e.target.value)
  }, [])

  const handleTokenBChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setTokenB(e.target.value)
  }, [])

  const whitePlayerLabel = activeGame?.whitePlayerId === matchInfo?.playerAId
    ? activeGame?.displayPlayerAId || matchInfo?.playerAId || 'Player A'
    : activeGame?.displayPlayerBId || matchInfo?.playerBId || 'Player B'

  const blackPlayerLabel = activeGame?.whitePlayerId === matchInfo?.playerAId
    ? activeGame?.displayPlayerBId || matchInfo?.playerBId || 'Player B'
    : activeGame?.displayPlayerAId || matchInfo?.playerAId || 'Player A'

  return (
    <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3.5 shadow-md">
      {/* Header with 1-click Copy */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242f42] pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">LLM Prompt</span>
          {copyState === 'copied' && (
            <output aria-live="polite" className="flex items-center gap-1 text-xs font-bold text-emerald-400 animate-bounce">
              <Check className="h-3.5 w-3.5" />
              <span>Copied to clipboard!</span>
            </output>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={copyPrompt}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98]"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Prompt</span>
          </button>
          <button
            type="button"
            onClick={handleToggleShow}
            className="rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-[#1a2230]"
            aria-expanded={showPrompt}
          >
            {showPrompt ? 'Hide' : 'Preview'}
          </button>
        </div>
      </div>

      {/* Side Selector Tabs */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-slate-400">Target Side:</span>
        <div className="inline-flex rounded-lg border border-[#2e3c54] bg-[#111620] p-0.5">
          <button
            type="button"
            onClick={handleSelectWhite}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              promptSide === 'white'
                ? 'bg-[#1c2536] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Circle className="h-2.5 w-2.5 fill-current text-amber-100" />
            <span>White:</span>
            <span className="max-w-[120px] truncate">{whitePlayerLabel}</span>
          </button>
          <button
            type="button"
            onClick={handleSelectBlack}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              promptSide === 'black'
                ? 'bg-[#1c2536] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Circle className="h-2.5 w-2.5 fill-current text-slate-500" />
            <span>Black:</span>
            <span className="max-w-[120px] truncate">{blackPlayerLabel}</span>
          </button>
        </div>
      </div>

      {/* Auth Tokens */}
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="block text-[11px] font-semibold text-slate-400">
          Player A Bearer Token
          <input
            type="password"
            placeholder="paste or auto-filled"
            value={currentTokenA}
            onChange={handleTokenAChange}
            autoComplete="off"
            spellCheck={false}
            className="mt-1 h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="block text-[11px] font-semibold text-slate-400">
          Player B Bearer Token
          <input
            type="password"
            placeholder="paste or auto-filled"
            value={currentTokenB}
            onChange={handleTokenBChange}
            autoComplete="off"
            spellCheck={false}
            className="mt-1 h-8 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-2.5 font-mono text-xs text-slate-200 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </div>

      {/* Prompt Preview */}
      {showPrompt && (
        <div className="mt-3 rounded-lg border border-[#242f42] bg-[#0c1017] p-3">
          <pre className="max-h-56 overflow-auto font-mono text-[11px] leading-relaxed text-slate-300 whitespace-pre-wrap">
            {getPromptFor(promptSide)}
          </pre>
        </div>
      )}
    </div>
  )
}
