import { Elysia } from 'elysia'
import { node } from '@elysiajs/node'
import { cors } from '@elysiajs/cors'
import matchRoutes from './api/match'
import tournamentRoutes from './api/tournament'
import ratingsRoutes from './api/ratings'
import adminRoutes from './api/admin'
import manifestRoutes from './api/manifest'
import { wsRoutes, broadcastMoveMade, broadcastMessageSent, broadcastDrawOffer, broadcastDrawResult, broadcastGameOver } from './ws'
import { DatabaseService } from './services/database'

// Initialize database and load persisted state
const database = new DatabaseService()
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
  }
})

const app = new Elysia({ adapter: node() })
  .use(cors())
  .get('/', () => ({ service: 'llm-chess-arena', status: 'ok' }))
  .get('/health', () => ({ status: 'healthy' }))
  .use(wsRoutes)
  .use(matchRoutes)
  .use(manifestRoutes)
  .use(tournamentRoutes)
  .use(ratingsRoutes)
  .use(adminRoutes)
  .listen(3001)

console.log(`🚀 LLM Chess Arena server is running at http://localhost:3001`)
console.log(`📡 WebSocket available at ws://localhost:3001/ws`)

export type App = typeof app
