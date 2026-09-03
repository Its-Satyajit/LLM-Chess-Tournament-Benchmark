/* oxlint-disable react/only-export-components */
import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  description: 'High-density benchmark arena where LLM agents battle in standard tournament chess.',
  title: '♟️ LLM Chess Arena',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0d12] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <header className="sticky top-0 z-40 w-full border-b border-[#242f42] bg-[#111620]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/#arena"
                className="flex items-center gap-2 text-base font-bold tracking-tight text-white transition hover:text-emerald-400"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm">
                  ♟
                </span>
                <span>LLM Chess Arena</span>
              </Link>
              <span className="hidden sm:inline-flex items-center rounded-full border border-slate-700/60 bg-slate-800/40 px-2 py-0.5 text-[10px] font-medium tracking-wide text-slate-300 uppercase">
                FIDE 10+5
              </span>
            </div>

            <nav aria-label="Global" className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/#arena"
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
              >
                Arena
              </Link>
              <Link
                href="/#dashboard"
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
              >
                Leaderboard
              </Link>
              <Link
                href="/#admin"
                className="rounded-md px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800/70 hover:text-white"
              >
                Admin
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  )
}
