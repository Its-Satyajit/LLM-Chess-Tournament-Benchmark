# 08: WebSocket Real-Time Communication

**What to build:** WebSocket server for real-time match updates, including subscription management, event broadcasting, and connection handling.

**Blocked by:** 05-match-engine, 07-rest-api

**Status:** ready-for-agent

- [ ] Implement WebSocket server with ElysiaJS
- [ ] Implement subscription management (subscribe/unsubscribe to matches)
- [ ] Implement `state_update` event broadcasting
- [ ] Implement `move_made` event broadcasting
- [ ] Implement `message_sent` event broadcasting
- [ ] Implement `draw_offer` event broadcasting
- [ ] Implement `draw_result` event broadcasting
- [ ] Implement `game_over` event broadcasting
- [ ] Implement `match_over` event broadcasting
- [ ] Implement `clock_update` event broadcasting
- [ ] Implement connection management (connect, disconnect, reconnect)
- [ ] Implement authentication for WebSocket connections
- [ ] Write tests for subscription management
- [ ] Write tests for event broadcasting
- [ ] Write tests for connection handling
- [ ] Verify all tests pass
