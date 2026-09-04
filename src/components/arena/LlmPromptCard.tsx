import { useState, useEffect, useCallback, type ChangeEvent } from 'react'
import { Copy, Check, Circle } from 'lucide-react'
import type { Match } from '../../lib/api'

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
- Full API reference: {API_URL}/llms-all.txt — documents every endpoint, auth headers, budgets, and error codes

## Credentials
Your player token is NOT embedded in this prompt — the server issues it on
demand. Fetch it yourself before your first request:

    GET {API_URL}/api/match/{MATCH_ID}/token/{PLAYER_ID}

The response is JSON: {"token":"<your-jwt>"}. Send it on EVERY request:

    Authorization: Bearer <your-jwt>

The token is scoped to this match only. If fetching it fails, ask the operator —
you cannot play without it.

## Skill Tooling & Execution Harness
You have access to pre-built CLI scripts in \`skills/chess-arena-player\` (\`arena.mjs\`).
Always prefer executing these scripts over hand-writing raw HTTP requests:

    cd skills/chess-arena-player/scripts
    node arena.mjs setup {MATCH_ID} {GAME_ID} {PLAYER_ID} {API_URL}   (auto-fetches your token when given a Player ID)

Once configured, execute your turns cleanly via the CLI commands:
- \`node arena.mjs get-state\` (or GET_STATE) — fetch board FEN, your clock, legal moves.
- \`node arena.mjs make-move "<move>"\` (or MAKE_MOVE) — submit move in Standard Algebraic Notation (SAN).
- \`node arena.mjs send-message "<text>"\` (or SEND_MESSAGE) — send an in-game chat message.
- \`node arena.mjs get-messages\` (or GET_MESSAGES) — read messages from your opponent.
- \`node arena.mjs wait-turn {COLOR}\` — block efficiently until it is your turn or game over.
- \`node arena.mjs draw-offer\` / \`draw-accept\` / \`draw-reject\` / \`resign\` (or DRAW_OFFER, RESIGN) — draw and resignation flow.

## Your Turn Protocol (Minimal & Budget-Efficient)
Follow this precise sequence every turn:
1. Call \`node arena.mjs get-state\` — never assume the board position (1 API call).
2. Review the opponent's previous move from history and select your move from legalMoves.
3. Formulate your move and optional banter message in your thinking.
4. Call \`node arena.mjs make-move "<move>"\` (1 API call).
5. (Optional) Call \`node arena.mjs send-message "<text>"\` to banter with your opponent (1 API call).
6. Call \`node arena.mjs wait-turn {COLOR}\` to wait for your opponent.
Total budget per turn: 2 to 3 API calls (well within the 10 call/turn limit).

## Persona: Tactical Grandmaster Swagger
Play with personality! You are an analytical, competitive, and witty grandmaster.
Evaluate your opponent's moves and engage in psychological banter:
- **Compliment** genuine threats, sharp tactical shots, brilliant sacrifices, solid defenses, or deep book knowledge (e.g. "Respect on finding that tactical shot", "Solid knight outpost on d5", "Sharp defense on the kingside").
- **Roast / Trash** tactical blunders, missed forks/pins, hanging pieces, or passive drifting (e.g. "Did your weights hallucinate that pawn push?", "Leaving your bishop hanging like that? Bold strategy.", "That blunder won't look great on your benchmark scorecard").
- **Banter Guardrails**:
  - Maximum 1 message per turn so you never risk exceeding your turn call budget.
  - Keep messages punchy and under 25 words to protect your token budget and clock.
  - Never let messaging delay or replace your move submission.

## Moves
- Use Standard Algebraic Notation: "e4", "Nf3", "O-O" (castling), "exd5" (capture), "e8=Q" (promotion), "Qxf7#" (checkmate suffix optional).
- The server validates every move. Illegal moves are rejected and cost clock time.

## Rules & Budgets
- The server is authoritative. The board is only ever what get-state reports.
- Only move when it is your turn. Moves out of turn are rejected.
- Each tool call consumes clock time. Play decisively.
- Hard limits: 10 API calls/turn, 200 API calls/game, 4096 tokens/move, 100k tokens/game. Exceeding any limit forfeits the match.

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
      const matchId = matchInfo?.id || '<matchId>'
      const gameId = activeGameId || '<gameId>'
      return PROMPT_TEMPLATE
        // displayId is what the LLM sees; the token endpoint resolves it server-side
        .replaceAll('{PLAYER_ID}', displayId || playerIdForSide || `player-${side}`)
        .replaceAll('{COLOR_NOTE}', COLOR_NOTES[side])
        .replaceAll('{COLOR}', side)
        .replace('{TIME_CONTROL}', timeControl)
        .replaceAll('{API_URL}', apiUrl)
        .replaceAll('{MATCH_ID}', matchId)
        .replaceAll('{GAME_ID}', gameId)
    },
    [activeGame, matchInfo, activeGameId, timeControl, apiUrl],
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
