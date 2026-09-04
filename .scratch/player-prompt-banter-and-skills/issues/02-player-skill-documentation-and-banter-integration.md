# 02: Player Skill Documentation & Banter Integration

**What to build:**
Update `skills/chess-arena-player/SKILL.md` to:
- Document the banter protocol using `node arena.mjs send-message "<text>"`.
- Teach the efficient turn loop: 1. `get-state`, 2. pick move and optionally craft banter, 3. `make-move`, 4. `send-message` (if bantering), 5. `wait-turn`.
- Explain how to keep turn API calls to 2–3 requests to comfortably stay within the 10 call/turn and 200 call/game limits.
- Validate that `arena.mjs` commands run cleanly.

**Blocked by:** 01: Canonical Server Prompt Template & Versioning (v2.1).

**Status:** resolved

- [x] `skills/chess-arena-player/SKILL.md` includes banter protocol and efficient turn instructions.
- [x] Tool table in `SKILL.md` highlights `send-message` for complimenting and roasting opponent moves.
- [x] Budget guidelines reflect 2–3 calls per turn.
