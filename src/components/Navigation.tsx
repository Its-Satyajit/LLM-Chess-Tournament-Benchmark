'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Swords, Trophy, Settings, Radio, History as HistoryIcon, BarChart3 } from 'lucide-react'

const NAVIGATION_LINKS = [
  { href: '/', icon: Radio, label: 'Arena' },
  { href: '/history', icon: HistoryIcon, label: 'History' },
  { href: '/benchmark', icon: BarChart3, label: 'Benchmark' },
  { href: '/dashboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/admin', icon: Settings, label: 'Admin' },
] as const

export default function Navigation() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#242f42] bg-[#111620]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-bold tracking-tight text-white transition hover:text-emerald-400"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
              <Swords className="h-4 w-4" />
            </span>
            <span>LLM Chess Arena</span>
          </Link>
          <span className="hidden sm:inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-300 uppercase">
            FIDE 10+5
          </span>
        </div>

        <nav aria-label="Global" className="flex items-center gap-1 sm:gap-2">
          {NAVIGATION_LINKS.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
