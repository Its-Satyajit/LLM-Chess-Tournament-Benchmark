import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import * as schema from './schema'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DATABASE_URL || resolve(__dirname, '../../data/db.sqlite')
mkdirSync(dirname(dbPath), { recursive: true })
const sqlite = new Database(dbPath)
export const db = drizzle(sqlite, { schema })

// Create tables if they don't exist
export function initializeDatabase(): void {
  sqlite.exec(`
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
    )
  `)
  sqlite.exec(`
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
    )
  `)
  sqlite.exec(`
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
    )
  `)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      model_name TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      glicko_rating REAL NOT NULL DEFAULT 1500,
      glicko_rd REAL NOT NULL DEFAULT 350,
      glicko_volatility REAL NOT NULL DEFAULT 0.06,
      games_played INTEGER NOT NULL DEFAULT 0,
      last_updated INTEGER NOT NULL
    )
  `)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tournaments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'round_robin',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL,
      completed_at INTEGER
    )
  `)
  sqlite.exec(`
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
    )
  `)
}

export { schema }
