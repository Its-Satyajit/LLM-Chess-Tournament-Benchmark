'use client'

import Arena from './Arena'
import Dashboard from './Dashboard'
import Admin from './Admin'

/**
 * Single operator console: watch the live board, stage matches, check
 * standings — all in a unified high-density workspace.
 */
export default function Console() {
  return (
    <div className="space-y-12 pb-16">
      <section id="arena" aria-label="Live arena" className="scroll-mt-16">
        <Arena />
      </section>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[#242f42]" />
        </div>
      </div>

      <section id="dashboard" aria-label="Leaderboard" className="scroll-mt-16">
        <Dashboard />
      </section>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-[#242f42]" />
        </div>
      </div>

      <section id="admin" aria-label="Stage matches" className="scroll-mt-16">
        <Admin />
      </section>
    </div>
  )
}
