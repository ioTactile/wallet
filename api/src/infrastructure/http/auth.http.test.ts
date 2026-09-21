import { afterEach, describe, expect, it } from 'vitest';

import { startTestApp } from './test-server.js';

describe('auth HTTP', () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it('registers, reads /me, and rejects a missing bearer', async () => {
    app = await startTestApp(new Date('2026-09-19T20:00:00.000Z'));

    const health = await app.inject({ method: 'GET', url: '/health' });
    expect(health.statusCode).toBe(200);
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['cross-origin-resource-policy']).toBe('cross-origin');

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
    app = await startTestApp();
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
    app = await startTestApp();
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
    app = await startTestApp();
    const response = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'short' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'invalid_body' });
  });

  it('allows PATCH in CORS preflight for /me', async () => {
    app = await startTestApp();
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
