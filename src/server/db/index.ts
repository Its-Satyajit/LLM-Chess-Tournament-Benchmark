import { drizzle } from 'drizzle-orm/libsql'
import { createClient, type Client } from '@libsql/client'
import * as schema from './schema'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Ensure .env is loaded before reading process.env (covers `nub server.ts` where Next hasn't loaded it yet)
if (process.loadEnvFile) {
  try {
    process.loadEnvFile(resolve(process.cwd(), '.env'))
  } catch {
    // ignore if already loaded or missing
  }
}

export interface ClientConfig {
  url: string
  authToken?: string
}

function getClientConfig(): ClientConfig {
  // Test isolation: never hit Turso from vitest — `clearAll()` would wipe production.
  const nodeEnv = process.env.NODE_ENV
  console.log('[db] getClientConfig NODE_ENV', nodeEnv, 'DATABASE_URL', process.env.DATABASE_URL?.slice(0, 40))
  if (nodeEnv === 'test') {
    console.log('[db] using test file')
    return { url: 'file:./data/test-db.sqlite' }
  }

  const rawUrl = process.env.DATABASE_URL
  console.log('[db] rawUrl', rawUrl?.slice(0, 50))
  if (!rawUrl || rawUrl.trim() === '') {
    throw new Error(
      'DATABASE_URL is required (Turso-only mode). Set DATABASE_URL=libsql://... and DATABASE_AUTH_TOKEN in .env',
    )
  }

  const url = rawUrl.trim()
  const isTurso =
    url.startsWith('libsql://') ||
    url.startsWith('https://') ||
    url.startsWith('wss://') ||
    url.startsWith('http://')

  if (!isTurso) {
    // Reject local file paths in non-test — Turso only
    if (process.env.NODE_ENV === 'test' && url.startsWith('file:')) {
      const authToken =
        process.env.DATABASE_AUTH_TOKEN ||
        process.env.TURSO_AUTH_TOKEN ||
        process.env.LIBSQL_AUTH_TOKEN
      return { url, authToken: authToken || undefined }
    }
    throw new Error(
      `DATABASE_URL must be a Turso/libSQL URL (libsql:// or https://), got: ${url}. Local file DB is no longer supported — only Turso.`,
    )
  }

  const authToken =
    process.env.DATABASE_AUTH_TOKEN ||
    process.env.TURSO_AUTH_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN

  if (!authToken) {
    throw new Error(
      'DATABASE_AUTH_TOKEN is required for Turso (libsql://) URLs. Set DATABASE_AUTH_TOKEN in .env',
    )
  }

  return { url, authToken }
}

// Global singleton for Next.js HMR / route-handler parity — client + drizzle must survive hot reloads
interface GlobalTursoState {
  __turso_client__?: Client
  __turso_drizzle__?: ReturnType<typeof drizzle>
}

// SAFETY: Extending globalThis to retain Turso client and Drizzle instance across Next.js HMR reloads
const globalForTurso = globalThis as typeof globalThis & GlobalTursoState

function getClient(): Client {
  if (!globalForTurso.__turso_client__) {
    globalForTurso.__turso_client__ = createClient(getClientConfig())
  }
  return globalForTurso.__turso_client__
}

function getDrizzle() {
  if (!globalForTurso.__turso_drizzle__) {
    globalForTurso.__turso_drizzle__ = drizzle(getClient(), { schema })
  }
  return globalForTurso.__turso_drizzle__
}

export const client = getClient()
export const db = getDrizzle()

// Create tables and run lightweight migrations
export async function initializeDatabase(): Promise<void> {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      player_a_id TEXT NOT NULL,
      player_b_id TEXT NOT NULL,
      player_a_model TEXT NOT NULL,
      player_b_model TEXT NOT NULL,
      secret TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      time_control TEXT NOT NULL DEFAULT '10+5',
      starting_position TEXT NOT NULL DEFAULT 'standard',
      chess960_seed INTEGER,
      board_mode TEXT NOT NULL DEFAULT 'assisted',
      is_private INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      match_id TEXT NOT NULL REFERENCES matches(id),
      game_number INTEGER NOT NULL,
      white_player_id TEXT NOT NULL,
      black_player_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result TEXT,
      result_reason TEXT,
      fen_initial TEXT NOT NULL,
      fen_final TEXT,
      move_count INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL REFERENCES games(id),
      event_type TEXT NOT NULL,
      player_id TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      game_move INTEGER,
      clock_white INTEGER,
      clock_black INTEGER
    );
    CREATE TABLE IF NOT EXISTS ratings (
      model_name TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      glicko_rating REAL NOT NULL DEFAULT 1500,
      glicko_rd REAL NOT NULL DEFAULT 350,
      glicko_volatility REAL NOT NULL DEFAULT 0.06,
      games_played INTEGER NOT NULL DEFAULT 0,
      last_updated INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'round_robin',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS tournament_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id TEXT NOT NULL REFERENCES tournaments(id),
      model_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      final_rating REAL NOT NULL DEFAULT 1500,
      wins INTEGER NOT NULL DEFAULT 0,
      draws INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      points REAL NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES games(id),
      sender TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      config TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS game_reviews (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL UNIQUE REFERENCES games(id),
      match_id TEXT NOT NULL REFERENCES matches(id),
      depth INTEGER NOT NULL DEFAULT 16,
      white_accuracy REAL NOT NULL,
      black_accuracy REAL NOT NULL,
      white_rating INTEGER,
      black_rating INTEGER,
      classification_counts TEXT NOT NULL,
      plies TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)

  // Migrate existing tables if columns were added later
  try {
    const tableInfo = await client.execute("PRAGMA table_info(matches)")
    const columnNames = new Set(tableInfo.rows.map(c => String(c.name)))
    if (!columnNames.has('is_private')) {
      await client.execute('ALTER TABLE matches ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0')
    }
    if (!columnNames.has('chess960_seed')) {
      await client.execute('ALTER TABLE matches ADD COLUMN chess960_seed INTEGER')
    }
    if (!columnNames.has('metrics')) {
      await client.execute('ALTER TABLE matches ADD COLUMN metrics TEXT')
    }
    if (!columnNames.has('secret')) {
      await client.execute('ALTER TABLE matches ADD COLUMN secret TEXT')
    }
  } catch (err) {
    console.error('⚠️  Migration check failed:', err)
  }
}
