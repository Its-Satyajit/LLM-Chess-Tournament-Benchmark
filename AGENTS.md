# Agents

## Runtime & toolchain

Prefer `nub` over `node`/`bun`/package managers — scripts: `nub run <script>`, files: `nub <file>`, local CLIs: `nubx <tool>`, installs: `nub install` / `nub add`. The existing lockfile is respected; use `nub --node <file>` for strict, unaugmented Node.

## Agent skills

### Issue tracker

Local markdown issues in `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout with per-package `CONTEXT.md`. See `docs/agents/domain.md`.
