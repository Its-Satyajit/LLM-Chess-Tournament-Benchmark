# 01: Canonical Server Prompt Template & Versioning (v2.1)

**What to build:**
Update the canonical `PROMPT_TEMPLATE` in `src/server/prompt/index.ts` to include:
- Explicit instructions on using the `skills/chess-arena-player` toolset (`arena.mjs`) for turn execution.
- Tactical Grandmaster Swagger persona: evaluate opponent moves on each turn, compliment tactical brilliance / sacrifices / solid defense, and roast blunders / missed opportunities / passive play.
- Strict budget constraints: at most 1 message per turn, concise messages (< 25 words), never delaying move submission.
- Bump `PROMPT_VERSION` from `v2.0` to `v2.1`.
- Synchronize `/llms-all.txt` in `src/server/api/llms.ts`.

**Blocked by:** None (can start immediately).

**Status:** resolved

- [x] `PROMPT_VERSION` is bumped to `v2.1` in `src/server/prompt/index.ts`.
- [x] `PROMPT_TEMPLATE` contains Tactical Grandmaster Swagger banter guidelines and skill script execution instructions.
- [x] Unit tests for prompt template formatting, token substitution, and manifest hash pass cleanly.
