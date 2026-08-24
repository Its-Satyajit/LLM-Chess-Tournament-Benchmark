import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Arena from './pages/Arena'
import Dashboard from './pages/Dashboard'
import Replay from './pages/Replay'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="bg-gray-800 p-4">
          <div className="container mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold">♟️ LLM Chess Arena</h1>
            <div className="flex gap-4">
              <a href="/" className="hover:text-blue-400">Arena</a>
              <a href="/dashboard" className="hover:text-blue-400">Dashboard</a>
              <a href="/admin" className="hover:text-blue-400">Admin</a>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Arena />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/replay/:gameId" element={<Replay />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
