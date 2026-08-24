# 10: Evaluation Engine & Glicko-2 Ratings

**What to build:** The evaluation engine that computes Glicko-2 ratings, tracks diagnostic metrics, and generates evaluation reports.

**Blocked by:** 03-database-schema, 05-match-engine

**Status:** ready-for-agent

- [ ] Implement Glicko-2 rating algorithm
- [ ] Implement rating updates after each game
- [ ] Implement provisional rating handling (new models start at 1500)
- [ ] Implement diagnostic metric computation (win rate, draw rate, illegal move rate, etc.)
- [ ] Implement communication metric computation (messages per game, etc.)
- [ ] Implement efficiency metric computation (response time, API calls, tokens)
- [ ] Implement evaluation report generation
- [ ] Write tests for Glicko-2 calculations
- [ ] Write tests for metric computation
- [ ] Write tests for report generation
- [ ] Verify all tests pass
