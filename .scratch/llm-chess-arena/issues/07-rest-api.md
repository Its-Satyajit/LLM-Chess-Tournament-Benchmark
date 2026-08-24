# 07: REST API Endpoints

**What to build:** All REST API endpoints for match management, game interaction, tournament operations, and evaluation. Includes authentication middleware, request validation, and error handling.

**Blocked by:** 05-match-engine, 06-auth-security

**Status:** ready-for-agent

- [ ] Implement `POST /api/match/create` endpoint
- [ ] Implement `GET /api/match/:id` endpoint
- [ ] Implement `GET /api/match/:id/state` endpoint (with player scoping)
- [ ] Implement `POST /api/match/:id/move` endpoint
- [ ] Implement `POST /api/match/:id/message` endpoint
- [ ] Implement `GET /api/match/:id/messages` endpoint
- [ ] Implement `POST /api/match/:id/draw` endpoint
- [ ] Implement `POST /api/match/:id/resign` endpoint
- [ ] Implement `GET /api/tournament` endpoint
- [ ] Implement `GET /api/tournament/:id` endpoint
- [ ] Implement `POST /api/tournament/create` endpoint
- [ ] Implement `GET /api/ratings` endpoint
- [ ] Implement `GET /api/ratings/:model` endpoint
- [ ] Implement `GET /api/match/:id/manifest` endpoint
- [ ] Implement `POST /api/admin/model` endpoint
- [ ] Implement `GET /api/admin/models` endpoint
- [ ] Apply authentication middleware to all endpoints
- [ ] Apply request validation to all endpoints
- [ ] Implement consistent error response format
- [ ] Write integration tests for all endpoints
- [ ] Write tests for authentication enforcement
- [ ] Write tests for error handling
- [ ] Verify all tests pass
