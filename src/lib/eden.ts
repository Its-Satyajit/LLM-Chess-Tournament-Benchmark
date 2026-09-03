import { treaty } from '@elysia/eden'
import type { app } from '../app/api/[[...slugs]]/route'

const getOrigin = (): string => {
  if (globalThis.process?.env?.NEXT_PUBLIC_API_URL) {
    return globalThis.process.env.NEXT_PUBLIC_API_URL
  }
  if (globalThis.window !== undefined) {
    return globalThis.window.location.origin
  }
  return 'http://localhost:3000'
}

export const api = treaty<typeof app>(getOrigin(), {
  // SAFETY: dynamic fetcher ensures Vitest global fetch mocks applied after import are respected
  fetcher: (...args: Parameters<typeof fetch>) => globalThis.fetch(...args),
})
