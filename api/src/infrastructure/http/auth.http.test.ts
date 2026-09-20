import { afterEach, describe, expect, it } from 'vitest';

import { createServer, registerApi } from '../../app.js';
import {
  FakeHasher,
  FixedClock,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
} from '../../application/fakes.js';
import { GetCurrentUser } from '../../application/get-current-user.js';
import { LoginUser } from '../../application/login-user.js';
import { LogoutUser } from '../../application/logout-user.js';
import { RefreshSession } from '../../application/refresh-session.js';
import { RegisterUser } from '../../application/register-user.js';
import { UpdateProfile } from '../../application/update-profile.js';
import { testEnv } from '../../config/env.js';
import { CryptoIdGenerator } from '../security/crypto-id-generator.js';
import { FastifyJwtTokenIssuer } from './fastify-jwt-token-issuer.js';

async function startApp() {
  const env = testEnv();
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const hasher = new FakeHasher();
  const clock = new FixedClock(new Date('2026-09-19T20:00:00.000Z'));
  const ids = new CryptoIdGenerator();
  const app = await createServer(env);
  const tokens = new FastifyJwtTokenIssuer(app.jwt, clock, 7 * 24 * 60 * 60 * 1000);

  await registerApi(app, {
    env,
    registerUser: new RegisterUser(users, refreshTokens, hasher, tokens, ids, clock),
    loginUser: new LoginUser(users, refreshTokens, hasher, tokens, ids, clock),
    refreshSession: new RefreshSession(users, refreshTokens, tokens, ids, clock),
    logoutUser: new LogoutUser(refreshTokens, tokens, clock),
    getCurrentUser: new GetCurrentUser(users),
    updateProfile: new UpdateProfile(users),
  });

  return app;
}

describe('auth HTTP', () => {
  let app: Awaited<ReturnType<typeof startApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it('registers, reads /me, and rejects a missing bearer', async () => {
    app = await startApp();

    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.headers['x-content-type-options']).toBe('nosniff');

    const created = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    expect(created.statusCode).toBe(201);
    const session = created.json();
    expect(session.user.email).toBe('jordan@example.com');

    const anonymous = await app.inject({ method: 'GET', url: '/me' });
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.json()).toEqual({ error: 'unauthorized' });

    const me = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({
      id: session.user.id,
      email: 'jordan@example.com',
      firstName: '',
      lastName: '',
    });

    const patched = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { firstName: 'Jordan', lastName: 'Dupont' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json()).toEqual({
      id: session.user.id,
      email: 'jordan@example.com',
      firstName: 'Jordan',
      lastName: 'Dupont',
    });
  });

  it('hides whether the email exists on login failure', async () => {
    app = await startApp();
    await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });

    const unknown = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'missing@example.com', password: 'longenough' },
    });
    const wrong = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'jordan@example.com', password: 'wrongpass' },
    });

    expect(unknown.statusCode).toBe(401);
    expect(wrong.statusCode).toBe(401);
    expect(unknown.json()).toEqual(wrong.json());
    expect(unknown.json()).toEqual({ error: 'invalid_credentials' });
  });

  it('rotates refresh tokens and logs out', async () => {
    app = await startApp();
    const created = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const session = created.json();

    const refreshed = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: session.refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);
    const next = refreshed.json();
    expect(next.refreshToken).not.toBe(session.refreshToken);

    const reused = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: session.refreshToken },
    });
    expect(reused.statusCode).toBe(401);

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken: next.refreshToken },
    });
    expect(logout.statusCode).toBe(204);
  });

  it('rejects a short password at the HTTP boundary', async () => {
    app = await startApp();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'short' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'invalid_body' });
  });

  it('allows PATCH in CORS preflight for /me', async () => {
    app = await startApp();
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/me',
      headers: {
        origin: 'http://localhost:8081',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-methods']).toMatch(/PATCH/i);
  });
});
