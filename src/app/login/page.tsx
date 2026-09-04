'use client'

import { Suspense } from 'react'
import Login from '@/views/Login'

export default function LoginPage() {
  // Login reads the ?next= param via useSearchParams, which needs a Suspense
  // boundary to stay compatible with static prerendering.
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  )
}
