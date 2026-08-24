# 02: Shared Types & Constants

**What to build:** The shared TypeScript types and constants package that both server and frontend import. Includes all domain types (Match, Game, Event, Player, Tool, etc.) and constants (error codes, time controls, game modes).

**Blocked by:** 01-project-setup

**Status:** ready-for-agent

- [ ] Define `Match` type (id, players, status, time_control, starting_position, etc.)
- [ ] Define `Game` type (id, match_id, players, status, result, fen, moves, etc.)
- [ ] Define `Event` type (id, game_id, type, player_id, data, timestamp, clock)
- [ ] Define `Player` type (id, color, model_config)
- [ ] Define `ModelConfig` type (provider, name, version, temperature, max_tokens, etc.)
- [ ] Define `Tool` types (GET_STATE, MAKE_MOVE, SEND_MESSAGE, GET_MESSAGES, DRAW_OFFER, RESIGN)
- [ ] Define `ToolResponse` types for each tool
- [ ] Define `WebSocketEvent` types (state_update, move_made, message_sent, etc.)
- [ ] Define `Rating` type (model, glicko_rating, rd, volatility, games_played)
- [ ] Define `Tournament` type (id, name, format, status, entries)
- [ ] Define `MatchManifest` type (full reproducibility manifest)
- [ ] Define constants: error codes, time controls, game modes, board modes
- [ ] Define `PromptTemplate` type with versioning
- [ ] Write tests for type guards and validators
