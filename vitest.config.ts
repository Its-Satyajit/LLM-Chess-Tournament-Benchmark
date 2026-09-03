import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'tools/**', '.next/**'],
    fileParallelism: false,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@llm-chess-arena/shared': path.resolve(import.meta.dirname, './src/shared/index.ts'),
      '@llm-chess-arena/server': path.resolve(import.meta.dirname, './src/server/index.ts'),
      '@llm-chess-arena/server/app': path.resolve(import.meta.dirname, './src/server/app.ts'),
      '@llm-chess-arena/server/ws': path.resolve(import.meta.dirname, './src/server/ws/index.ts'),
      '@llm-chess-arena/server/database': path.resolve(import.meta.dirname, './src/server/services/database.ts'),
    },
  },
})
