# 01: Project Setup & Workspace Configuration

**What to build:** A fully configured monorepo workspace with NodeJS, TypeScript, ElysiaJS server, React+Vite frontend, shared types package, and all tooling (Biome, Vitest, Docker, Husky).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Initialize NodeJS workspace with `package.json` workspaces
- [ ] Create `packages/server/` with ElysiaJS + TypeScript config
- [ ] Create `packages/web/` with React + Vite + TypeScript config
- [ ] Create `packages/shared/` with shared types package
- [ ] Configure Biome for linting and formatting
- [ ] Configure Vitest for testing
- [ ] Configure Husky + lint-staged for pre-commit hooks
- [ ] Create `docker/Dockerfile` and `docker/docker-compose.yml`
- [ ] Create root `NodeJSfig.toml`
- [ ] Verify `NodeJS install` and `NodeJS dev` works for all packages
- [ ] Verify `NodeJS test` runs (even with zero tests)
- [ ] Verify Docker build succeeds
