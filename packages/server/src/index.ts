import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import matchRoutes from './api/match'
import tournamentRoutes from './api/tournament'
import ratingsRoutes from './api/ratings'
import adminRoutes from './api/admin'
import manifestRoutes from './api/manifest'
import { llmsRoutes } from './api/llms'
import { nodeAdapter, wsRoutes, broadcastMoveMade, broadcastMessageSent, broadcastDrawOffer, broadcastDrawResult, broadcastGameOver, broadcastMatchOver, broadcastGameStarted } from './ws'
import { database } from './services/database'

// Initialize database and load persisted state.
// NOTE: this MUST be the shared singleton — api/match.ts uses the same
// instance, so engine events (moves, messages) flow to the WS broadcaster.
database.loadMatches().then(() => {
  console.log('📦 Loaded persisted matches from database')
}).catch((error) => {
  console.error('⚠️  Failed to load matches:', error)
})

const engine = database.getEngine()

// Wire MatchEngine events to WebSocket broadcast
engine.onEvent((event) => {
  switch (event.eventType) {
    case 'move': {
    // SAFETY: event.data.clock is set by makeMove which always passes { white, black }
      const clock = event.data.clock as { white: number; black: number } | undefined
      broadcastMoveMade(
        event.matchId,
        event.gameId,
        // SAFETY: type assertion is validated by upstream schema/parsing
        (event.data.move as string) || '',
        event.playerId,
        clock || { white: 0, black: 0 },
      )
      break
    }
    case 'message':
      // SAFETY: type assertion is validated by upstream schema/parsing
      broadcastMessageSent(event.matchId, event.gameId, event.playerId, (event.data.content as string) || '')
      break
    case 'draw_offer':
      broadcastDrawOffer(event.matchId, event.gameId, event.playerId)
      break
    case 'draw_accept':
      broadcastDrawResult(event.matchId, event.gameId, true)
      break
    case 'draw_reject':
      broadcastDrawResult(event.matchId, event.gameId, false)
      break
    case 'game_over':
      // SAFETY: type assertion is validated by upstream schema/parsing
      broadcastGameOver(event.matchId, event.gameId, (event.data.result as string) || '', (event.data.reason as string) || '')
      break
    case 'game_started':
      broadcastGameStarted(
        event.matchId,
        event.gameId,
        (event.data.gameNumber as number) || 1,
        (event.data.whitePlayerId as string) || '',
        (event.data.blackPlayerId as string) || '',
      )
      break
    case 'match_completed':
      broadcastMatchOver(event.matchId, (event.data.result as string) || 'Match Finished')
      break
  }
})

// Serve the built web app when present (single-container deployments).
const webDist = resolve(process.cwd(), 'packages/web/dist')
const hasWebBuild = existsSync(join(webDist, 'index.html'))

function serveFile(path: string): Response | null {
  // SAFETY: path comes from the URL; join + prefix check prevents traversal
  const file = join(webDist, path)
  if (!file.startsWith(webDist) || !existsSync(file) || !statSync(file).isFile()) {
    return null
  }
  const ext = path.slice(path.lastIndexOf('.') + 1)
  const types: Record<string, string> = {
    css: 'text/css', html: 'text/html', js: 'text/javascript', json: 'application/json',
    png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2', ico: 'image/x-icon',
  }
  return new Response(readFileSync(file), {
    headers: { 'Content-Type': types[ext] ?? 'application/octet-stream' },
  })
}

// Registered last so API routes take precedence
const webUi = (app: Elysia) => {
  if (!hasWebBuild) {
    return app.get('/', () => ({ service: 'llm-chess-arena', status: 'ok' }))
  }
  console.log('🖼️  Serving web UI from packages/web/dist')
  return app
    .get('/assets/*', ({ params }) => {
      const file = serveFile(`assets/${(params as { '*': string })['*']}`)
      return file ?? new Response('Not found', { status: 404 })
    })
    .get('/*', ({ request }) => {
      const url = new URL(request.url)
      // SPA fallback: any non-API GET serves index.html
      const file = serveFile(url.pathname === '/' ? 'index.html' : url.pathname.slice(1))
      return file ?? serveFile('index.html') ?? new Response('Web build not found', { status: 404 })
    })
}

void new Elysia({ adapter: nodeAdapter })
  .use(cors())
  .get('/health', () => ({ status: 'healthy' }))
  .use(wsRoutes)
  .use(matchRoutes)
  .use(manifestRoutes)
  .use(llmsRoutes)
  .use(tournamentRoutes)
  .use(ratingsRoutes)
  .use(adminRoutes)
  .use(webUi)
  .listen(3001)

console.log(`🚀 LLM Chess Arena server is running at http://localhost:3001`)
console.log(`📡 WebSocket available at ws://localhost:3001/ws`)
