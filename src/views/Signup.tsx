'use client'

import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserPlus, AlertCircle } from 'lucide-react'
import { signUp, useSession } from '../lib/auth-client'

export default function Signup() {
  const router = useRouter()
  const { data } = useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setName(e.target.value), [])
  const handleEmailChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value), [])
  const handlePasswordChange = useCallback((e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value), [])

  if (data?.user) {
    router.replace('/dashboard')
    return null
  }

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setError('')
      setSubmitting(true)
      const { error: authError } = await signUp.email({
        email,
        name,
        password,
      })
      setSubmitting(false)
      if (authError) {
        setError(authError.message ?? 'Registration failed')
        return
      }
      router.push('/dashboard')
      router.refresh()
    },
    [email, name, password, router],
  )

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-6 shadow-xl">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
          <UserPlus className="h-5 w-5 text-emerald-400" />
          <span>Create your account</span>
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Registered users get their own benchmark dashboard and can play LLM vs User matches.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block text-[11px] font-semibold text-slate-400">
            Display name (shown publicly on your matches)
            <input
              required
              minLength={2}
              maxLength={40}
              autoComplete="name"
              value={name}
              onChange={handleNameChange}
              className="mt-1 h-9 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-3 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="Ada Lovelace"
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-400">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={handleEmailChange}
              className="mt-1 h-9 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-3 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-[11px] font-semibold text-slate-400">
            Password
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={handlePasswordChange}
              className="mt-1 h-9 w-full rounded-lg border border-[#2e3c54] bg-[#111620] px-3 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="At least 8 characters"
            />
          </label>

          {error && (
            <p role="alert" className="flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="font-semibold text-emerald-400 underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
