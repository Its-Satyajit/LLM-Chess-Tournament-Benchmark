import { Elysia, t } from 'elysia'
import type { ModelConfig } from '@llm-chess-arena/shared'

const models: { id: string; name: string; provider: string; config: ModelConfig }[] = [],

 adminRoutes = new Elysia({ prefix: '/api/admin' })
  .get('/models', () => (
    {
      models: models.map(m => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
      })),
    }
  ))
  .post('/models', ({ body }) => {
    const id = `MODEL-${Date.now()}`
    models.push({
      config: {
        maxOutputTokens: body.maxOutputTokens || 4096,
        name: body.name,
        provider: body.provider,
        temperature: body.temperature || 0.7,
        version: body.version || '1.0',
      },
      id,
      name: body.name,
      provider: body.provider,
    })
    return { id, name: body.name, provider: body.provider }
  }, {
    body: t.Object({
      maxOutputTokens: t.Optional(t.Number()),
      name: t.String(),
      provider: t.String(),
      temperature: t.Optional(t.Number()),
      version: t.Optional(t.String()),
    })
  })
  .delete('/models/:modelId', ({ params }) => {
    const index = models.findIndex(m => m.id === params.modelId)
    if (index === -1) {return { error: 'Model not found' }}
    models.splice(index, 1)
    return { success: true }
  })

export default adminRoutes
