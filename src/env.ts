import { createEnv } from '@t3-oss/env-nextjs'
import { t } from 'elysia'
import { Value } from '@sinclair/typebox/value'
import type { TSchema, Static } from '@sinclair/typebox'

// oxlint-disable-next-line anti-slop/no-unknown-parameters
function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.length > 0
}

interface StandardIssue {
  readonly message: string
  readonly path?: ReadonlyArray<PropertyKey>
}

type StandardResult<Output> =
  | { readonly issues?: undefined; readonly value: Output }
  | { readonly issues: ReadonlyArray<StandardIssue> }

interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
    readonly types: {
      readonly input: Input
      readonly output: Output
    }
    // oxlint-disable-next-line anti-slop/no-unknown-parameters
    readonly validate: (value: unknown) => StandardResult<Output>
    readonly vendor: string
    readonly version: 1
  }
}

interface TypeboxEnvOptions<Out> {
  default?: Out
  transform?: (val: string) => Out
}

function typeboxEnv<T extends TSchema, Out = Static<T>>(
  schema: T,
  options?: TypeboxEnvOptions<Out>,
): StandardSchemaV1<unknown, Out> {
  return {
    '~standard': {
      types: {
        // SAFETY: StandardSchema phantom type metadata
        input: undefined as unknown,
        // SAFETY: StandardSchema phantom type metadata
        output: undefined as Out,
      },
      // oxlint-disable-next-line anti-slop/no-unknown-parameters
      validate: (value: unknown): StandardResult<Out> => {
        let processed = value
        if (
          (processed === undefined || processed === '') &&
          options?.default !== undefined
        ) {
          processed = options.default
        } else if (options?.transform && isNonEmptyString(processed)) {
          try {
            processed = options.transform(processed)
          } catch {
            return { issues: [{ message: 'Transformation failed' }] }
          }
        }

        if (Value.Check(schema, processed)) {
          // SAFETY: Value.Check verified that processed matches schema
          return { value: processed as Out }
        }

        const errors = [...Value.Errors(schema, processed)]
        return {
          issues: errors.map((e) => ({
            message: e.message,
            path: e.path.split('/').filter(Boolean),
          })),
        }
      },
      vendor: 'elysia-typebox',
      version: 1,
    },
  }
}

export const env = createEnv({
  client: {
    NEXT_PUBLIC_API_URL: typeboxEnv(t.Optional(t.String())),
  },
  runtimeEnv: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
    DATABASE_URL: process.env.DATABASE_URL,
    HOST: process.env.HOST,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
  },
  server: {
    // Turso-only: DATABASE_URL must be libsql://... ; local file fallback removed
    BETTER_AUTH_SECRET: typeboxEnv(t.String({ minLength: 32 }), {
      default: 'dev-better-auth-secret-change-in-production-000',
    }),
    BETTER_AUTH_URL: typeboxEnv(t.String(), { default: 'http://localhost:3000' }),
    DATABASE_AUTH_TOKEN: typeboxEnv(t.String({ minLength: 1 })),
    DATABASE_URL: typeboxEnv(t.String({ minLength: 1 })),
    HOST: typeboxEnv(t.String(), { default: 'localhost' }),
    JWT_SECRET: typeboxEnv(t.String(), { default: 'dev-secret-change-in-production' }),
    NODE_ENV: typeboxEnv(
      t.Union([t.Literal('development'), t.Literal('test'), t.Literal('production')]),
      { default: 'development' },
    ),
    PORT: typeboxEnv(t.Number(), {
      default: 3000,
      transform: (v) => Number.parseInt(v, 10),
    }),
  },
  skipValidation:
    process.env.SKIP_ENV_VALIDATION === 'true' ||
    process.env.NODE_ENV === 'test',
})
