#!/usr/bin/env node
// Install the chess-arena-player skill into your agent using the
// vercel-labs/skills CLI (https://github.com/vercel-labs/skills).
//
// Usage:
//   node install.mjs                     # install from GitHub via npx skills
//   node install.mjs --local             # copy this folder instead (no network)
//
// The CLI asks where to install (./.agent/skills, ~/.claude/skills, ...);
// answer interactively or pass e.g. `-- -y` flags through to it.

import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILL_DIR = dirname(fileURLToPath(import.meta.url))
const REPO = 'Its-Satyajit/LLM-Chess-Tournament-Benchmark'
const SKILL_PATH = `skills/chess-arena-player`
const local = process.argv.includes('--local')

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts })
  return r.status === 0
}

if (local) {
  // Offline fallback: copy the skill folder into the conventional .agent/skills dir
  const target = join(process.cwd(), '.agent', 'skills', 'chess-arena-player')
  if (target.startsWith(SKILL_DIR)) {
    console.error('Refusing to install into the skill itself. Run from your project root:')
    console.error('  node /path/to/chess-arena-player/install.mjs --local')
    process.exit(1)
  }
  rmSync(target, { recursive: true, force: true })
  mkdirSync(dirname(target), { recursive: true })
  cpSync(SKILL_DIR, target, { recursive: true })
  console.log(`Copied skill to ${target}`)
  console.log('Next: node <target>/scripts/arena.mjs setup <matchId> <gameId> <token>')
  process.exit(0)
}

console.log(`Installing skill ${REPO}/${SKILL_PATH} via the skills CLI...`)
const ok = run('npx', ['-y', 'skills', 'add', `${REPO}/${SKILL_PATH}`])

if (!ok) {
  console.error('\nskills CLI failed (no network, or cancelled). Offline install:')
  console.error('  node install.mjs --local')
  process.exit(1)
}

console.log('\nNext: cd into the installed skill and run')
console.log('  node scripts/arena.mjs setup <matchId> <gameId> <token>')
