import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import * as schema from './schema'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Try loading environment from root .env if not yet loaded
if (process.loadEnvFile) {
  try {
    process.loadEnvFile(resolve(process.cwd(), '.env'))
  } catch {
    // ignore if already loaded or missing
  }
}

export function getClientConfig() {
  const rawUrl = process.env.DATABASE_URL || resolve(process.cwd(), 'data/db.sqlite')
  const authToken =
    process.env.DATABASE_AUTH_TOKEN ||
    process.env.TURSO_AUTH_TOKEN ||
    process.env.LIBSQL_AUTH_TOKEN

  let url = rawUrl
  // If it's a local filesystem path without protocol, prefix with file:
  if (
    !url.startsWith('libsql://') &&
    !url.startsWith('http://') &&
    !url.startsWith('https://') &&
    !url.startsWith('file:')
  ) {
    const absPath = resolve(/*turbopackIgnore: true*/ process.cwd(), url)
    mkdirSync(dirname(absPath), { recursive: true })
    url = `file:${absPath}`
  }

  return { url, authToken: authToken || undefined }
}

const clientConfig = getClientConfig()
export const client = createClient(clientConfig)
export const db = drizzle(client, { schema })

// Create tables and run lightweight migrations
export async function initializeDatabase(): Promise<void> {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      player_a_id TEXT NOT NULL,
      player_b_id TEXT NOT NULL,
      player_a_model TEXT NOT NULL,
      player_b_model TEXT NOT NULL,
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
  } catch (err) {
    console.error('⚠️  Migration check failed:', err)
  }
}

export { schema }
