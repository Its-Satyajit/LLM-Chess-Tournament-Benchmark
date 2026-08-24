import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  playerAId: text('player_a_id').notNull(),
  playerBId: text('player_b_id').notNull(),
  playerAModel: text('player_a_model').notNull(), // JSON string
  playerBModel: text('player_b_model').notNull(), // JSON string
  status: text('status').notNull().default('pending'), // pending | active | completed
  timeControl: text('time_control').notNull().default('10+5'),
  startingPosition: text('starting_position').notNull().default('standard'), // standard | chess960
  chess960Seed: integer('chess960_seed'),
  boardMode: text('board_mode').notNull().default('assisted'), // pure | assisted
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id),
  gameNumber: integer('game_number').notNull(),
  whitePlayerId: text('white_player_id').notNull(),
  blackPlayerId: text('black_player_id').notNull(),
  status: text('status').notNull().default('pending'), // pending | active | completed
  result: text('result'), // white_win | black_win | draw | white_forfeit | black_forfeit
  resultReason: text('result_reason'), // checkmate | stalemate | repetition | 50_move | insufficient | timeout | resign | draw_offer
  fenInitial: text('fen_initial').notNull(),
  fenFinal: text('fen_final'),
  moveCount: integer('move_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})

export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: text('game_id').notNull().references(() => games.id),
  eventType: text('event_type').notNull(), // move | message | state_read | draw_offer | draw_accept | draw_reject | resign | illegal_move | error
  playerId: text('player_id').notNull(),
  data: text('data').notNull(), // JSON string
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
  gameMove: integer('game_move'),
  clockWhite: integer('clock_white'),
  clockBlack: integer('clock_black'),
})

export const ratings = sqliteTable('ratings', {
  modelName: text('model_name').primaryKey(),
  provider: text('provider').notNull(),
  glickoRating: real('glicko_rating').notNull().default(1500),
  glickoRd: real('glicko_rd').notNull().default(350),
  glickoVolatility: real('glicko_volatility').notNull().default(0.06),
  gamesPlayed: integer('games_played').notNull().default(0),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull(),
})

export const tournaments = sqliteTable('tournaments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  format: text('format').notNull().default('round_robin'), // round_robin | swiss | knockout
  status: text('status').notNull().default('pending'), // pending | active | completed
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
})

export const tournamentEntries = sqliteTable('tournament_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id),
  modelName: text('model_name').notNull(),
  provider: text('provider').notNull(),
  finalRating: real('final_rating').notNull().default(1500),
  wins: integer('wins').notNull().default(0),
  draws: integer('draws').notNull().default(0),
  losses: integer('losses').notNull().default(0),
  points: real('points').notNull().default(0),
})
