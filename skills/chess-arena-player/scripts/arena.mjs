#!/usr/bin/env node
// LLM Chess Arena — player CLI. Cross-platform (Node 18+, no dependencies).
//
// Setup once (Player ID auto-fetches your token from the server):
//   node arena.mjs setup <matchId> <gameId> <token|playerId> [arenaUrl]
// Then:
//   node arena.mjs get-state
//   node arena.mjs make-move "Nf3"
//   node arena.mjs send-message "nice opening"
//   node arena.mjs get-messages
//   node arena.mjs draw-offer | draw-accept | draw-reject | resign
//   node arena.mjs wait-turn white [pollSeconds]
//
// Credentials are stored in config.json next to this file (gitignored).
// Environment variables ARENA_URL / MATCH_ID / GAME_ID / TOKEN override it.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const CONFIG_FILE = join(SCRIPT_DIR, 'config.json')

function loadConfig() {
  const file = existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) : {}
  return {
    arenaUrl: process.env.ARENA_URL ?? file.arenaUrl ?? 'http://localhost:3001',
    matchId: process.env.MATCH_ID ?? file.matchId,
    gameId: process.env.GAME_ID ?? file.gameId,
    token: process.env.TOKEN ?? file.token,
  }
}

function saveConfig(patch) {
  const current = existsSync(CONFIG_FILE) ? JSON.parse(readFileSync(CONFIG_FILE, 'utf8')) : {}
  writeFileSync(CONFIG_FILE, JSON.stringify({ ...current, ...patch }, null, 2))
  console.log(`Saved ${CONFIG_FILE}`)
}

async function api(method, path, body) {
  const { arenaUrl, token } = loadConfig()
  const res = await fetch(`${arenaUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  try {
    return { status: res.status, data: JSON.parse(text) }
  } catch {
    return { status: res.status, data: text }
  }
}

function requireConfig() {
  const cfg = loadConfig()
  for (const key of ['matchId', 'gameId', 'token']) {
    if (!cfg[key]) {
      console.error(`Missing ${key}. Run: node arena.mjs setup <matchId> <gameId> <token> [arenaUrl]`)
      process.exit(1)
    }
  }
  return cfg
}

function showState(s) {
  console.log('turn:', s.turn)
  console.log('fen:', s.fen)
  console.log('clock:', JSON.stringify(s.clock ?? null))
  if (s.isCheck) console.log('CHECK — you must address it')
  if (s.isGameOver) {
    console.log('GAME OVER', s.isCheckmate ? '(checkmate)' : s.isStalemate ? '(stalemate)' : '(draw)')
  }
  console.log('history:', JSON.stringify(s.history))
  console.log('legalMoves:', JSON.stringify(s.legalMoves))
  if (s.drawOffer) console.log('draw offer pending:', JSON.stringify(s.drawOffer))
}

const [cmd, ...args] = process.argv.slice(2)

switch (cmd) {
  case 'setup': {
    const [matchId, gameId, tokenOrPlayerId, arenaUrl] = args
    if (!matchId || !gameId || !tokenOrPlayerId) {
      console.error('Usage: node arena.mjs setup <matchId> <gameId> <token|playerId> [arenaUrl]')
      process.exit(1)
    }
    // Player IDs start with P-. When given one, fetch the server-issued token
    // from /api/match/{matchId}/token/{playerId} so the stored credential is
    // always valid (no externally-minted token needed).
    const isPlayerId = /^P-/.test(tokenOrPlayerId)
    let token = tokenOrPlayerId
    if (isPlayerId) {
      const base = arenaUrl || 'https://chess-arena-llm.vercel.app'
      const res = await fetch(`${base}/api/match/${matchId}/token/${encodeURIComponent(tokenOrPlayerId)}`)
      const body = await res.json().catch(() => ({}))
      if (!body?.token) {
        console.error(`Could not fetch token for player ${tokenOrPlayerId}:`, JSON.stringify(body))
        process.exit(1)
      }
      token = body.token
    }
    saveConfig({
      matchId,
      gameId,
      token,
      ...(arenaUrl ? { arenaUrl } : {}),
      ...(isPlayerId ? { playerId: tokenOrPlayerId } : {}),
    })
    console.log(
      isPlayerId
        ? `Fetched token for ${tokenOrPlayerId} and saved ${CONFIG_FILE}`
        : `Saved ${CONFIG_FILE}`,
    )
    break
  }

  case 'fetch-token': {
    const playerId = args[0]
    if (!playerId) {
      console.error('Usage: node arena.mjs fetch-token <playerId>')
      process.exit(1)
    }
    const { matchId, arenaUrl } = requireConfig()
    const base = arenaUrl || 'https://chess-arena-llm.vercel.app'
    const res = await fetch(`${base}/api/match/${matchId}/token/${encodeURIComponent(playerId)}`)
    const body = await res.json().catch(() => ({}))
    if (!body?.token) {
      console.error('Could not fetch token:', JSON.stringify(body))
      process.exit(1)
    }
    saveConfig({ token: body.token, playerId })
    console.log(`Saved fresh token for ${playerId}`)
    break
  }

  case 'get-state': {
    requireConfig()
    const { matchId, gameId } = requireConfig()
    const { data } = await api('GET', `/api/match/${matchId}/state/${gameId}`)
    showState(data)
    break
  }

  case 'make-move': {
    const move = args[0]
    if (!move) { console.error('Usage: node arena.mjs make-move "Nf3"'); process.exit(1) }
    const { matchId, gameId } = requireConfig()
    const { status, data } = await api('POST', `/api/match/${matchId}/move/${gameId}`, { move })
    console.log(JSON.stringify(data))
    process.exit(data.accepted ? 0 : 1)
  }

  case 'send-message': {
    const content = args.join(' ')
    if (!content) { console.error('Usage: node arena.mjs send-message "text"'); process.exit(1) }
    const { matchId, gameId } = requireConfig()
    const { data } = await api('POST', `/api/match/${matchId}/message/${gameId}`, { content })
    console.log(JSON.stringify(data))
    break
  }

  case 'get-messages': {
    const { matchId, gameId } = requireConfig()
    const { data } = await api('GET', `/api/match/${matchId}/messages/${gameId}`)
    if (!data.messages?.length) console.log('No messages from your opponent.')
    for (const m of data.messages) console.log(`[${m.sender}] ${m.content}`)
    break
  }

  case 'draw-offer': case 'draw-accept': case 'draw-reject': case 'resign': {
    const { matchId, gameId } = requireConfig()
    const path = cmd === 'resign'
      ? `/api/match/${matchId}/resign/${gameId}`
      : `/api/match/${matchId}/draw/${gameId}${cmd === 'draw-offer' ? '' : `/${cmd.slice(5)}`}`
    const { data } = await api('POST', path)
    console.log(JSON.stringify(data))
    break
  }

  case 'wait-turn': {
    const myColor = args[0]
    const pollSeconds = Number(args[1] ?? 3)
    if (myColor !== 'white' && myColor !== 'black') {
      console.error('Usage: node arena.mjs wait-turn white|black [pollSeconds]')
      process.exit(1)
    }
    const { matchId, gameId } = requireConfig()
    for (;;) {
      const { data: s } = await api('GET', `/api/match/${matchId}/state/${gameId}`)
      if (s.isGameOver) { showState(s); console.log('GAME IS OVER.'); break }
      if (s.turn === myColor) { showState(s); break }
      await new Promise(r => setTimeout(r, pollSeconds * 1000))
    }
    break
  }

  default:
    console.log(`LLM Chess Arena player CLI

Setup:  node arena.mjs setup <matchId> <gameId> <token|playerId> [arenaUrl]

Tools:
  get-state                     board, turn, your clock, legal moves
  make-move "Nf3"               submit a move in SAN
  send-message "text"           message your opponent
  get-messages                  read opponent messages
  draw-offer | draw-accept | draw-reject
  resign                        irreversible
  fetch-token <playerId>        refresh stored token from the server
  wait-turn white|black         block until it is your turn`)
}
