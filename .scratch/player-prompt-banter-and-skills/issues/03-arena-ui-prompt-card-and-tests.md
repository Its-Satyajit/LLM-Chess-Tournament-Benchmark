# 03: Arena UI Prompt Card & Component Tests

**What to build:**
Update `src/components/arena/LlmPromptCard.tsx` to:
- Synchronize its `PROMPT_TEMPLATE` with the enhanced `v2.1` prompt featuring Tactical Grandmaster Swagger banter and skill tool usage.
- Preserve prompt previewing, color switching, token copying, and token binding.
- Add or update tests verifying the card renders the new banter guidelines and skill script commands.

**Blocked by:** 01: Canonical Server Prompt Template & Versioning (v2.1).

**Status:** resolved

- [x] `LlmPromptCard.tsx` contains the `v2.1` prompt with banter and skill commands.
- [x] In-app prompt preview and copy functionality render properly.
- [x] Tests verify prompt template includes banter and skill instructions.
