import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
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
  });
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
    ...overrides,
  };
}
