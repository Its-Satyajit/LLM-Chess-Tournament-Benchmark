import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import Console from './pages/Console'
import Replay from './pages/Replay'

function App() {
  return (
    <BrowserRouter>
      <nav className="arena-nav" aria-label="Main">
        <div className="container">
          <ul>
            <li>
              <strong className="brand">♟️ LLM Chess Arena</strong>
            </li>
            <li><Link to="/#arena">Arena</Link></li>
            <li><Link to="/#admin">Admin</Link></li>
            <li><Link to="/#dashboard">Dashboard</Link></li>
          </ul>
        </div>
      </nav>
      <main className="container">        <Routes>
          <Route path="/" element={<Console />} />
          <Route path="/replay/:matchId/:gameId" element={<Replay />} />
          {/* Old routes now live as sections of the console */}
          <Route path="/dashboard" element={<Navigate to="/#dashboard" replace />} />
          <Route path="/admin" element={<Navigate to="/#admin" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
