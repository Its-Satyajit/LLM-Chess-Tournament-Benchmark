import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const matches = sqliteTable('matches', {
  boardMode: text('board_mode').notNull().default('assisted'), // pure | assisted
  chess960Seed: integer('chess960_seed'),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  id: text('id').primaryKey(),
  isPrivate: integer('is_private', { mode: 'boolean' }).notNull().default(false),
  playerAId: text('player_a_id').notNull(),
  playerAModel: text('player_a_model').notNull(), // JSON string
  playerBId: text('player_b_id').notNull(),
  playerBModel: text('player_b_model').notNull(), // JSON string
  metrics: text('metrics'), // JSON string of aggregate MatchMetrics
  startingPosition: text('starting_position').notNull().default('standard'), // standard | chess960
  status: text('status').notNull().default('pending'), // pending | active | completed
  timeControl: text('time_control').notNull().default('10+5'),
})

export const games = sqliteTable('games', {
  blackPlayerId: text('black_player_id').notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  fenFinal: text('fen_final'),
  fenInitial: text('fen_initial').notNull(),
  gameNumber: integer('game_number').notNull(),
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id),
  moveCount: integer('move_count').notNull().default(0),
  result: text('result'), // white_win | black_win | draw | white_forfeit | black_forfeit
  resultReason: text('result_reason'), // checkmate | stalemate | repetition | 50_move | insufficient | timeout | resign | draw_offer
  status: text('status').notNull().default('pending'), // pending | active | completed
  whitePlayerId: text('white_player_id').notNull(),
})

export const events = sqliteTable('events', {
  clockBlack: integer('clock_black'),
  clockWhite: integer('clock_white'),
  data: text('data').notNull(), // JSON string
  eventType: text('event_type').notNull(), // move | message | state_read | draw_offer | draw_accept | draw_reject | resign | illegal_move | error
  gameId: text('game_id').notNull().references(() => games.id),
  gameMove: integer('game_move'),
  id: integer('id').primaryKey({ autoIncrement: true }),
  playerId: text('player_id').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
})

export const ratings = sqliteTable('ratings', {  gamesPlayed: integer('games_played').notNull().default(0),
  glickoRating: real('glicko_rating').notNull().default(1500),
  glickoRd: real('glicko_rd').notNull().default(350),
  glickoVolatility: real('glicko_volatility').notNull().default(0.06),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull(),
  modelName: text('model_name').primaryKey(),
  provider: text('provider').notNull(),
})

export const tournaments = sqliteTable('tournaments', {
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  format: text('format').notNull().default('round_robin'), // round_robin | swiss | knockout
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('pending'), // pending | active | completed,
})

export const tournamentEntries = sqliteTable('tournament_entries', {
  draws: integer('draws').notNull().default(0),
  finalRating: real('final_rating').notNull().default(1500),
  id: integer('id').primaryKey({ autoIncrement: true }),
  losses: integer('losses').notNull().default(0),
  modelName: text('model_name').notNull(),
  points: real('points').notNull().default(0),
  provider: text('provider').notNull(),
  tournamentId: text('tournament_id').notNull().references(() => tournaments.id),
  wins: integer('wins').notNull().default(0),
})

export const messages = sqliteTable('messages', {
  content: text('content').notNull(),
  gameId: text('game_id').notNull().references(() => games.id),
  id: text('id').primaryKey(),
  sender: text('sender').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
})

export const models = sqliteTable('models', {
  config: text('config').notNull(), // JSON string (ModelConfig)
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  provider: text('provider').notNull(),
})

export const gameReviews = sqliteTable('game_reviews', {
  blackAccuracy: real('black_accuracy').notNull(),
  blackRating: integer('black_rating'),
  classificationCounts: text('classification_counts').notNull(), // JSON string { white: {...}, black: {...} }
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  depth: integer('depth').notNull().default(16),
  gameId: text('game_id').notNull().unique().references(() => games.id),
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id),
  plies: text('plies').notNull(), // JSON string PlyReview[]
  whiteAccuracy: real('white_accuracy').notNull(),
  whiteRating: integer('white_rating'),
})
