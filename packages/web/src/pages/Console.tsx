import Arena from './Arena'
import Dashboard from './Dashboard'
import Admin from './Admin'

/**
 * Single operator console: watch the live board, stage matches, check
 * standings — all on one scrolling page. Sections double as anchors so
 * the top nav can jump straight to each area.
 */
export default function Console() {
  return (
    <>
      <section id="arena" className="page-section" aria-label="Live arena">
        <Arena />
      </section>

      <hr className="section-rule" />

      <section id="admin" className="page-section" aria-label="Stage matches">
        <Admin />
      </section>

      <hr className="section-rule" />

      <section id="dashboard" className="page-section" aria-label="Leaderboard">
        <Dashboard />
      </section>
    </>
  )
}
