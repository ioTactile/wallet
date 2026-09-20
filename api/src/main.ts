import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { GetCurrentUser } from './application/get-current-user.js';
import { LoginUser } from './application/login-user.js';
import { LogoutUser } from './application/logout-user.js';
import { RefreshSession } from './application/refresh-session.js';
import { RegisterUser } from './application/register-user.js';
import { UpdateProfile } from './application/update-profile.js';
import { createServer, registerApi } from './app.js';
import { loadEnv } from './config/env.js';
import { FastifyJwtTokenIssuer } from './infrastructure/http/fastify-jwt-token-issuer.js';
import { applyAuthSchema } from './infrastructure/persistence/apply-schema.js';
import { DrizzleRefreshTokenRepository } from './infrastructure/persistence/drizzle-refresh-token-repository.js';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user-repository.js';
import * as schema from './infrastructure/persistence/schema.js';
import { Argon2Hasher } from './infrastructure/security/argon2-hasher.js';
import { CryptoIdGenerator } from './infrastructure/security/crypto-id-generator.js';
import { SystemClock } from './infrastructure/security/system-clock.js';

async function main() {
  const env = loadEnv();
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = postgres(env.DATABASE_URL);
  const db = drizzle(client, { schema });
  await applyAuthSchema(db);

  const users = new DrizzleUserRepository(db);
  const refreshTokens = new DrizzleRefreshTokenRepository(db);
  const hasher = new Argon2Hasher();
  const clock = new SystemClock();
  const ids = new CryptoIdGenerator();

  const app = await createServer(env);
  const tokens = new FastifyJwtTokenIssuer(
    app.jwt,
    clock,
    env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
  );

  await registerApi(app, {
    env,
    registerUser: new RegisterUser(users, refreshTokens, hasher, tokens, ids, clock),
    loginUser: new LoginUser(users, refreshTokens, hasher, tokens, ids, clock),
    refreshSession: new RefreshSession(users, refreshTokens, tokens, ids, clock),
    logoutUser: new LogoutUser(refreshTokens, tokens, clock),
    getCurrentUser: new GetCurrentUser(users),
    updateProfile: new UpdateProfile(users),
  });

  await app.listen({ port: env.PORT, host: '0.0.0.0' });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
