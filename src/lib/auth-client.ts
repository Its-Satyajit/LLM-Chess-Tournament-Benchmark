'use client'

// Single shared Better Auth client. The UI talks to the same origin's
// /api/auth/* endpoints mounted on the Elysia app — no second auth mechanism.
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

// Thin typed re-exports so pages/components never import better-auth directly.
export const useSession = authClient.useSession
export const signIn = authClient.signIn
export const signUp = authClient.signUp
export const signOut = authClient.signOut
export const getSession = authClient.getSession
