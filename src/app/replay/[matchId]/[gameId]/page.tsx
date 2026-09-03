'use client'

import { use } from 'react'
import Replay from '@/views/Replay'

export default function ReplayPage({
  params,
}: {
  params: Promise<{ matchId: string; gameId: string }>
}) {
  const { matchId, gameId } = use(params)
  return <Replay matchId={matchId} gameId={gameId} />
}
