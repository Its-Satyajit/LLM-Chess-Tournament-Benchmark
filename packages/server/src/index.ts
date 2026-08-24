import { Hono } from 'hono'
import { serve } from '@hono/node-server'

const app = new Hono()

app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'llm-chess-arena' })
})

app.get('/health', (c) => {
  return c.json({ status: 'healthy' })
})

const port = parseInt(process.env.PORT || '3001', 10)

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 LLM Chess Arena server is running at http://localhost:${info.port}`)
})

export type App = typeof app
