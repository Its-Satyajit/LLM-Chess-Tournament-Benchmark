'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Swords,
  Settings,
  Radio,
  History as HistoryIcon,
  BarChart3,
  Trophy,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
} from 'lucide-react'
import { signOut, useSession } from '../lib/auth-client'

const PUBLIC_LINKS = [
  { href: '/', icon: Radio, label: 'Arena' },
  { href: '/history', icon: HistoryIcon, label: 'History' },
  { href: '/benchmark', icon: BarChart3, label: 'Benchmark' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/admin', icon: Settings, label: 'Admin' },
] as const

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const { data, isPending } = useSession()
  const user = data?.user ?? null

  const handleLogout = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#242f42] bg-[#111620]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold tracking-tight text-white transition hover:text-emerald-400"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <Swords className="h-4 w-4" />
            </span>
            <span className="hidden sm:inline">LLM Chess Arena</span>
          </Link>
          <span className="hidden md:inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-300 uppercase">
            FIDE 10+5
          </span>
        </div>

        <nav aria-label="Global" className="flex items-center gap-0.5 sm:gap-1.5 overflow-x-auto">
          {PUBLIC_LINKS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-1 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                  pathname === '/dashboard'
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                    : 'border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden md:inline">Dashboard</span>
              </Link>
              <span
                className="hidden max-w-[140px] truncate rounded-full border border-slate-700/60 bg-slate-800/50 px-2.5 py-1 text-[11px] font-semibold text-slate-200 lg:inline-block"
                title={user.email}
              >
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 rounded-lg border border-slate-700/60 bg-slate-800/50 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-rose-500/15 hover:text-rose-300"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : isPending ? (
            <span className="px-2 text-[11px] text-slate-500" aria-busy="true">
              …
            </span>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1 rounded-lg border border-[#2e3c54] bg-[#1c2536] px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Log in</span>
              </Link>
              <Link
                href="/signup"
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign up</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
