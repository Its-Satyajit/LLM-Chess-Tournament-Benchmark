'use client'

import AuthGuard from '@/components/AuthGuard'
import Dashboard from '@/views/Dashboard'

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}
