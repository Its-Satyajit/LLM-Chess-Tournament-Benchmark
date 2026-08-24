import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import Arena from './pages/Arena'
import Dashboard from './pages/Dashboard'
import Replay from './pages/Replay'
import Admin from './pages/Admin'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 ${
    isActive ? 'text-blue-400 font-semibold' : 'hover:text-blue-300'
  }`

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="bg-gray-800 p-4">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold">♟️ LLM Chess Arena</h1>
            <div className="flex gap-4">
              <NavLink to="/" end className={navLinkClass} aria-current="page">Arena</NavLink>
              <NavLink to="/dashboard" className={navLinkClass} aria-current="page">Dashboard</NavLink>
              <NavLink to="/admin" className={navLinkClass} aria-current="page">Admin</NavLink>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Arena />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/replay/:matchId/:gameId" element={<Replay />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
