import { Elysia, t } from 'elysia'
import { database } from '../services/database'

const adminRoutes = new Elysia({ prefix: '/api/admin' })
  .get('/models', async () => {
    console.log('[admin] GET /models')
    const loaded = await database.loadModels()
    console.log('[admin] loaded', loaded.length)
    return {
      models: loaded.map((m) => ({
        id: m.id,
        name: m.name,
        provider: m.provider,
      })),
    }
  })
  .post(
    '/models',
    async ({ body }) => {
      console.log('[admin] POST /models', body)
      const id = `MODEL-${Date.now()}`
      const model = {
        config: {
          maxOutputTokens: body.maxOutputTokens || 4096,
          name: body.name.trim(),
          provider: body.provider.trim(),
          temperature: body.temperature || 0.7,
          version: body.version || '1.0',
        },
        id,
        name: body.name.trim(),
        provider: body.provider.trim(),
      }
      await database.addModel(model)
      console.log('[admin] added', id)
      return { id, name: model.name, provider: model.provider }
    },
    {
      body: t.Object({
        maxOutputTokens: t.Optional(t.Number()),
        name: t.String({ minLength: 1 }),
        provider: t.String({ minLength: 1 }),
        temperature: t.Optional(t.Number()),
        version: t.Optional(t.String()),
      }),
    },
  )
  .delete('/models/:modelId', async ({ params }) => {
    await database.deleteModel(params.modelId)
    return { success: true }
  })

export default adminRoutes
