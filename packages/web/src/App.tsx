import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import Arena from './pages/Arena'
import Dashboard from './pages/Dashboard'
import Replay from './pages/Replay'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <nav className="arena-nav">
        <div className="container">
          <ul>
            <li>
              <strong className="brand">♟️ LLM Chess Arena</strong>
            </li>
            <li>
              <NavLink to="/" end>Arena</NavLink>
            </li>
            <li>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </li>
            <li>
              <NavLink to="/admin">Admin</NavLink>
            </li>
          </ul>
        </div>
      </nav>
      <main className="container">
        <Routes>
          <Route path="/" element={<Arena />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/replay/:matchId/:gameId" element={<Replay />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
