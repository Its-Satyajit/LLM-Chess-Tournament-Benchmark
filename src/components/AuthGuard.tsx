'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '../lib/auth-client'

// Client-side route guard. This is UX only — every protected operation is
// also authorized server-side via the Better Auth session (see /api/benchmarks).
export default function AuthGuard({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession()
  const router = useRouter()
  const authed = Boolean(data?.user)

  useEffect(() => {
    if (!isPending && !authed) {
      router.replace('/login?next=/dashboard')
    }
  }, [authed, isPending, router])

  if (isPending) {
    return (
      <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-10 text-center text-xs text-slate-400" aria-busy="true">
        Checking your session…
      </div>
    )
  }

  if (!authed) {
    return null
  }

  return <>{children}</>
}
