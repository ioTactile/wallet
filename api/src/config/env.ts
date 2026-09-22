import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1).optional(),
    JWT_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES: z.string().default('15m'),
    JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
    CORS_ORIGIN: z.string().default('*'),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
    PUBLIC_API_URL: z.url().default('http://127.0.0.1:3000'),
    BANK_PROVIDER: z.enum(['sandbox', 'gocardless', 'enablebanking']).default('sandbox'),
    GOCARDLESS_SECRET_ID: z.string().min(1).optional(),
    GOCARDLESS_SECRET_KEY: z.string().min(1).optional(),
    GOCARDLESS_INSTITUTION_ID: z.string().min(1).default('BOURSORAMA_BOUSFRPPXXX'),
    ENABLEBANKING_APPLICATION_ID: z.string().min(1).optional(),
    ENABLEBANKING_PRIVATE_KEY: z.string().min(1).optional(),
    ENABLEBANKING_ASPSP_NAME: z.string().min(1).default('Boursorama Banque'),
    ENABLEBANKING_ASPSP_COUNTRY: z.string().min(2).max(2).default('FR'),
  })
  .superRefine((env, ctx) => {
    if (env.BANK_PROVIDER === 'gocardless') {
      if (!env.GOCARDLESS_SECRET_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['GOCARDLESS_SECRET_ID'],
          message: 'GOCARDLESS_SECRET_ID is required when BANK_PROVIDER=gocardless',
        });
      }
      if (!env.GOCARDLESS_SECRET_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['GOCARDLESS_SECRET_KEY'],
          message: 'GOCARDLESS_SECRET_KEY is required when BANK_PROVIDER=gocardless',
        });
      }
    }
    if (env.BANK_PROVIDER === 'enablebanking') {
      if (!env.ENABLEBANKING_APPLICATION_ID) {
        ctx.addIssue({
          code: 'custom',
          path: ['ENABLEBANKING_APPLICATION_ID'],
          message: 'ENABLEBANKING_APPLICATION_ID is required when BANK_PROVIDER=enablebanking',
        });
      }
      if (!env.ENABLEBANKING_PRIVATE_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['ENABLEBANKING_PRIVATE_KEY'],
          message: 'ENABLEBANKING_PRIVATE_KEY is required when BANK_PROVIDER=enablebanking',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return envSchema.parse({
    NODE_ENV: source.NODE_ENV,
    PORT: source.PORT,
    DATABASE_URL: source.DATABASE_URL,
    JWT_SECRET: source.JWT_SECRET,
    JWT_ACCESS_EXPIRES: source.JWT_ACCESS_EXPIRES,
    JWT_REFRESH_TTL_DAYS: source.JWT_REFRESH_TTL_DAYS,
    CORS_ORIGIN: source.CORS_ORIGIN,
    RATE_LIMIT_MAX: source.RATE_LIMIT_MAX,
    AUTH_RATE_LIMIT_MAX: source.AUTH_RATE_LIMIT_MAX,
    PUBLIC_API_URL: source.PUBLIC_API_URL,
    BANK_PROVIDER: blankToUndefined(source.BANK_PROVIDER),
    GOCARDLESS_SECRET_ID: blankToUndefined(source.GOCARDLESS_SECRET_ID),
    GOCARDLESS_SECRET_KEY: blankToUndefined(source.GOCARDLESS_SECRET_KEY),
    GOCARDLESS_INSTITUTION_ID: blankToUndefined(source.GOCARDLESS_INSTITUTION_ID),
    ENABLEBANKING_APPLICATION_ID: blankToUndefined(source.ENABLEBANKING_APPLICATION_ID),
    ENABLEBANKING_PRIVATE_KEY: blankToUndefined(source.ENABLEBANKING_PRIVATE_KEY),
    ENABLEBANKING_ASPSP_NAME: blankToUndefined(source.ENABLEBANKING_ASPSP_NAME),
    ENABLEBANKING_ASPSP_COUNTRY: blankToUndefined(source.ENABLEBANKING_ASPSP_COUNTRY),
  });
}

function blankToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    PORT: 3000,
    JWT_SECRET: 'test-secret-at-least-32-characters!',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_TTL_DAYS: 7,
    CORS_ORIGIN: '*',
    RATE_LIMIT_MAX: 10_000,
    AUTH_RATE_LIMIT_MAX: 10_000,
    PUBLIC_API_URL: 'http://127.0.0.1:3000',
    BANK_PROVIDER: 'sandbox',
    GOCARDLESS_INSTITUTION_ID: 'BOURSORAMA_BOUSFRPPXXX',
    ENABLEBANKING_ASPSP_NAME: 'Boursorama Banque',
    ENABLEBANKING_ASPSP_COUNTRY: 'FR',
    ...overrides,
  };
}
