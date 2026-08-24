# 12: Game Replay System

**What to build:** The replay system that allows completed games to be replayed move-by-move, including board positions, messages, and timestamps.

**Blocked by:** 03-database-schema, 05-match-engine

**Status:** ready-for-agent

- [ ] Implement replay data generation from event log
- [ ] Implement board state reconstruction at each move
- [ ] Implement message timeline integration
- [ ] Implement replay API endpoint
- [ ] Implement replay data format (move-by-move with FEN, messages, timestamps)
- [ ] Write tests for replay generation
- [ ] Write tests for board state reconstruction
- [ ] Verify all tests pass
