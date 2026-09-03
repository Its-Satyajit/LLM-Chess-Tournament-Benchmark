import { existsSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Elysia } from 'elysia'
import { apiApp } from './app'
export { apiApp } from './app'
import { nodeAdapter, wsRoutes, wireEngineEvents } from './ws'
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
wireEngineEvents(engine)

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
  const types = {
    css: 'text/css', html: 'text/html', js: 'text/javascript', json: 'application/json',
    png: 'image/png', svg: 'image/svg+xml', woff2: 'font/woff2', ico: 'image/x-icon',
  } as const satisfies Record<string, string>
  // SAFETY: ext is looked up in known mime types with octet-stream fallback
  const mime = types[ext as keyof typeof types] ?? 'application/octet-stream'
  return new Response(readFileSync(file), {
    headers: { 'Content-Type': mime },
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
      // SAFETY: wildcard route param '*' captures the relative asset filename
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
  .use(apiApp)
  .use(wsRoutes)
  .use(webUi)
  .listen(3001)

console.log(`🚀 LLM Chess Arena server is running at http://localhost:3001`)
console.log(`📡 WebSocket available at ws://localhost:3001/ws`)
