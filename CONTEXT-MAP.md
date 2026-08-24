# Context Map

This is a multi-context monorepo. Each package has its own context.

## Contexts

| Context | Path | Description |
|---------|------|-------------|
| Server | `packages/server/CONTEXT.md` | ElysiaJS backend, game logic, API |
| Web | `packages/web/CONTEXT.md` | React frontend, UI components |
| Shared | `packages/shared/CONTEXT.md` | Shared types, constants, utilities |

## System-wide Decisions

ADRs for cross-cutting concerns live in `docs/adr/`:
- ADR-001 through ADR-019 cover project architecture, tech stack, and design decisions

## Context-specific Decisions

Each package may have its own `docs/adr/` directory for package-specific decisions.
