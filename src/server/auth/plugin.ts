import { Elysia, status } from 'elysia'
import { auth, type SessionUser, type Session } from './userAuth'

// Mounts the official Better Auth handler at /api/auth/* (Better Auth owns
// sign-up/login/logout/session endpoints and cookies) and exposes a
// `requireSession` route guard macro:
//
//   .get('/secret', ({ user }) => ..., { requireSession: true })
//
// The authenticated user is always derived from the Better Auth session —
// never from client-provided identifiers. When no valid session exists the
// guard short-circuits with 401 before the route handler runs.
export const userAuthPlugin = new Elysia({ name: 'user-auth' })
  .all('/api/auth/*', ({ request }) => auth.handler(request))
  .macro({
    requireSession: {
      async resolve({ request }) {
        const sessionData = await auth.api.getSession({ headers: request.headers })
        if (!sessionData) {
          return status(401, { error: 'Unauthorized' })
        }
        return {
          authSession: sessionData.session,
          user: sessionData.user,
        }
      },
    },
  })

export type UserAuthContext = {
  user: SessionUser
  authSession: Session
}

// Convenience for routes that must read the session without hard-failing
// (e.g. public pages personalising content for signed-in visitors).
export async function getOptionalUser(
  request: Request,
): Promise<{ user: SessionUser | null; authSession: Session | null }> {
  const sessionData = await auth.api.getSession({ headers: request.headers })
  return {
    authSession: sessionData?.session ?? null,
    user: sessionData?.user ?? null,
  }
}
