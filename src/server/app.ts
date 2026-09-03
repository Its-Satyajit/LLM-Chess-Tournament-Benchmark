import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import matchRoutes from './api/match'
import tournamentRoutes from './api/tournament'
import ratingsRoutes from './api/ratings'
import adminRoutes from './api/admin'
import manifestRoutes from './api/manifest'
import { llmsRoutes } from './api/llms'

export const apiApp = new Elysia()
  .use(cors())
  .get('/health', () => ({ status: 'healthy' }))
  .get('/api/health', () => ({ status: 'healthy' }))
  .use(matchRoutes)
  .use(manifestRoutes)
  .use(llmsRoutes)
  .use(tournamentRoutes)
  .use(ratingsRoutes)
  .use(adminRoutes)

export type ApiApp = typeof apiApp
