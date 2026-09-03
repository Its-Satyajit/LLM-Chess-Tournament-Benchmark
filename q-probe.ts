import { db, initializeDatabase } from './src/server/db'
import { matches, games, events } from './src/server/db/schema'

async function main() {
  await initializeDatabase()
  const all = await db.select().from(matches)
  console.log('matches rows:', all.length)
  for (const m of all) {
    const hit = m.playerAId === 'P-4A1871' || m.playerBId === 'P-4A1871'
    console.log(m.id, 'A=', m.playerAId, 'B=', m.playerBId, 'private=', m.isPrivate, 'status=', m.status, hit ? '<-- HIT' : '')
  }
  const gamesAll = await db.select().from(games)
  console.log('games rows:', gamesAll.length)
  const gHit = gamesAll.filter((g) => g.whitePlayerId === 'P-4A1871' || g.blackPlayerId === 'P-4A1871')
  console.log('games referencing P-4A1871:', gHit.length)
  const ev = await db.select().from(events)
  console.log('events rows:', ev.length)
  const eHit = ev.filter((e) => e.data && e.data.includes('P-4A1871'))
  console.log('events referencing P-4A1871:', eHit.length)
}

main().catch((e) => { console.error('ERR', e); process.exit(1) })
