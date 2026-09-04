import { betterAuth } from 'better-auth'
import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { db } from '../db'
import { account, session, user, verification } from '../db/schema'
import { env } from '../../env'

// Better Auth reads BETTER_AUTH_SECRET / BETTER_AUTH_URL from the environment
// itself, but in dev/test the validated env defaults keep imports side-effect
// free without a .env file. Production fails fast below when the secret is the
// dev placeholder.
if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = env.BETTER_AUTH_SECRET
}
if (!process.env.BETTER_AUTH_URL) {
  process.env.BETTER_AUTH_URL = env.BETTER_AUTH_URL
}

if (
  env.NODE_ENV === 'production' &&
  (env.BETTER_AUTH_SECRET.startsWith('dev-') || env.BETTER_AUTH_SECRET.length < 32)
) {
  throw new Error(
    'BETTER_AUTH_SECRET must be set to a strong (>= 32 char) value in production',
  )
}

// Better Auth is the single source of truth for user accounts: registration,
// login, sessions, session validation/expiry, logout, password hashing and
// verification. Application code only reads the session — it never touches
// passwords or tokens directly.
export const auth = betterAuth({
  appName: 'LLM Chess Arena',
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'sqlite', // libSQL (Turso in production, file DB in tests)
    schema: { account, session, user, verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // No email provider is configured — users may register and sign in
    // immediately (email verification not required for the v1 flow).
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // sliding refresh after 1 day
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === 'production',
    defaultCookieAttributes: {
      sameSite: 'lax',
    },
  },
})

export type SessionUser = typeof auth.$Infer.Session.user
export type Session = typeof auth.$Infer.Session.session
