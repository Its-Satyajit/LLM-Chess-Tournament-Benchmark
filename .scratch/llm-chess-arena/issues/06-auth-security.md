# 06: Authentication & Security Layer

**What to build:** Zero-trust security layer with per-player JWT tokens, scoped credentials, rate limiting, request validation, and match isolation.

**Blocked by:** 05-match-engine

**Status:** ready-for-agent

- [ ] Implement JWT token generation for player authentication
- [ ] Implement token validation middleware
- [ ] Implement scope checking (player can only access their match)
- [ ] Implement turn order validation (player can only act on their turn)
- [ ] Implement rate limiting (10 req/s, 20 req/turn)
- [ ] Implement request schema validation
- [ ] Implement match isolation (no cross-match access)
- [ ] Implement admin API key authentication
- [ ] Write tests for token generation and validation
- [ ] Write tests for scope enforcement
- [ ] Write tests for rate limiting
- [ ] Write tests for turn order validation
- [ ] Write tests for cross-match access prevention
- [ ] Verify all tests pass
