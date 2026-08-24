# 05: Match Engine & Game Flow

**What to build:** The core match engine that manages match creation, game flow, turn order, clock management, tool execution, and event logging. This is the heart of the system.

**Blocked by:** 03-database-schema, 04-chess-logic

**Status:** ready-for-agent

- [ ] Implement `MatchEngine` class
- [ ] Implement match creation (generate player IDs, create games, assign colors)
- [ ] Implement game initialization (set starting position, create first game)
- [ ] Implement turn management (whose turn, turn validation)
- [ ] Implement clock management (start, stop, increment, flag fall detection)
- [ ] Implement tool execution (GET_STATE, MAKE_MOVE, SEND_MESSAGE, GET_MESSAGES, DRAW_OFFER, RESIGN)
- [ ] Implement draw offer flow (offer → pending → accept/reject → cooldown)
- [ ] Implement resignation flow (immediate, irrevocable)
- [ ] Implement game completion (result, reason, final state)
- [ ] Implement match progression (game 1 → game 2 → game 3 → game 4)
- [ ] Implement event logging (every action recorded as immutable event)
- [ ] Implement token/API call budget enforcement
- [ ] Write tests for full game flow (create → moves → checkmate)
- [ ] Write tests for draw scenarios (all types)
- [ ] Write tests for timeout handling
- [ ] Write tests for error handling (illegal moves, malformed input)
- [ ] Write tests for match progression (4 games, color alternation)
- [ ] Verify all tests pass
