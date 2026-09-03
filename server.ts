import { createServer } from 'node:http'
import next from 'next'
import { env } from './src/env'
import { wsHandler, wireEngineEvents } from './src/server/ws'
import { database } from './src/server/services/database'

const dev = env.NODE_ENV !== 'production'
const hostname = env.HOST
const port = env.PORT

// Initialize database and load persisted state.
database.loadMatches().then(() => {
  console.log('📦 Loaded persisted matches from database')
}).catch((error) => {
  console.error('⚠️  Failed to load matches:', error)
})

const engine = database.getEngine()
wireEngineEvents(engine)

const nextApp = next({ dev, hostname, port })
const handle = nextApp.getRequestHandler()

void nextApp.prepare().then(() => {
  const server = createServer((req, res) => {
    void handle(req, res)
  })

  // Intercept WebSocket upgrade requests for /ws
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    if (url.pathname === '/ws') {
      wsHandler.handleUpgrade(req, socket, head)
    } else {
      socket.destroy()
    }
  })

  server.listen(port, hostname, () => {
    console.log(`🚀 LLM Chess Arena running at http://${hostname}:${port}`)
    console.log(`📡 WebSocket available at ws://${hostname}:${port}/ws`)
  })
})
