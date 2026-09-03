/* oxlint-disable react/only-export-components */
import type { Metadata } from 'next'
import Navigation from '@/components/Navigation'
import QueryProvider from '@/components/QueryProvider'
import './globals.css'

export const metadata: Metadata = {
  description: 'High-density benchmark arena where LLM agents battle in standard tournament chess.',
  title: 'LLM Chess Arena',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0d12] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <QueryProvider>
          <Navigation />
          <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
            {children}
          </main>
        </QueryProvider>
      </body>
    </html>
  )
}
