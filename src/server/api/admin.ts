import { Elysia, t } from 'elysia'
import type { ModelConfig } from '@llm-chess-arena/shared'
import { database } from '../services/database'

interface StoredModel {
  id: string
  name: string
  provider: string
  config: ModelConfig
}

// Loaded from SQLite on startup; every mutation is persisted
const models: StoredModel[] = []

void database.loadModels().then((loaded) => {
  for (const m of loaded) {
    // SAFETY: models persisted in database follow StoredModel schema
    models.push(m as StoredModel)
  }
  if (loaded.length > 0) {
    console.log(`📦 Loaded ${loaded.length} models from database`)
  }
})

const persist = () => void database.saveModels(models)

const adminRoutes = new Elysia({ prefix: '/api/admin' })
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
    persist()
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
    persist()
    return { success: true }
  })

export default adminRoutes
