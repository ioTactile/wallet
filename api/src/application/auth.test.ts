import { describe, expect, it } from 'vitest';

import { EmailAlreadyTaken, InvalidCredentials, InvalidRefreshToken } from '../domain/errors.js';
import { EnsureDefaultCashAccount } from './ensure-default-cash-account.js';
import {
  FakeHasher,
  FakeTokenIssuer,
  FixedClock,
  InMemoryAccountRepository,
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  SequentialIds,
} from './fakes.js';
import { GetCurrentUser } from './get-current-user.js';
import { LoginUser } from './login-user.js';
import { LogoutUser } from './logout-user.js';
import { RefreshSession } from './refresh-session.js';
import { RegisterUser } from './register-user.js';
import { UpdateProfile } from './update-profile.js';

function auth() {
  const users = new InMemoryUserRepository();
  const refreshTokens = new InMemoryRefreshTokenRepository();
  const accounts = new InMemoryAccountRepository();
  const hasher = new FakeHasher();
  const tokens = new FakeTokenIssuer();
  const ids = new SequentialIds();
  const clock = new FixedClock(new Date('2026-09-19T20:00:00.000Z'));
  const ensureDefaultCash = new EnsureDefaultCashAccount(accounts, ids, clock);

  return {
    users,
    refreshTokens,
    clock,
    tokens,
    register: new RegisterUser(users, refreshTokens, hasher, tokens, ids, clock, ensureDefaultCash),
    login: new LoginUser(users, refreshTokens, hasher, tokens, ids, clock),
    refresh: new RefreshSession(users, refreshTokens, tokens, ids, clock),
    logout: new LogoutUser(refreshTokens, tokens, clock),
    me: new GetCurrentUser(users),
    updateProfile: new UpdateProfile(users),
  };
}

describe('auth use cases', () => {
  it('registers a user and opens a session', async () => {
    const { register } = auth();
    const session = await register.execute({
      email: 'jordan@example.com',
      password: 'longenough',
    });

    expect(session.user.email).toBe('jordan@example.com');
    expect(session.user.firstName).toBe('');
    expect(session.user.lastName).toBe('');
    expect(session.accessToken).toBe('access:id-1');
    expect(session.refreshToken).toBe('refresh-1');
  });

  it("updates the current user's first and last name", async () => {
    const { register, updateProfile, me } = auth();
    const session = await register.execute({
      email: 'jordan@example.com',
      password: 'longenough',
    });

    const updated = await updateProfile.execute(session.user.id, {
      firstName: 'Jordan',
      lastName: 'Dupont',
    });
    expect(updated).toEqual({
      id: session.user.id,
      email: 'jordan@example.com',
      firstName: 'Jordan',
      lastName: 'Dupont',
    });
    expect(await me.execute(session.user.id)).toEqual(updated);
  });

  it('rejects a duplicate email', async () => {
    const { register } = auth();
    await register.execute({ email: 'jordan@example.com', password: 'longenough' });
    await expect(
      register.execute({ email: 'jordan@example.com', password: 'longenough' }),
    ).rejects.toBeInstanceOf(EmailAlreadyTaken);
  });

  it('logs in with the same invalid-credentials error for unknown email or bad password', async () => {
    const { register, login } = auth();
    await register.execute({ email: 'jordan@example.com', password: 'longenough' });

    await expect(
      login.execute({ email: 'missing@example.com', password: 'longenough' }),
    ).rejects.toBeInstanceOf(InvalidCredentials);
    await expect(
      login.execute({ email: 'jordan@example.com', password: 'wrongpass' }),
    ).rejects.toBeInstanceOf(InvalidCredentials);
  });

  it('rotates the refresh token and rejects reuse of the old one', async () => {
    const { register, refresh, refreshTokens, tokens } = auth();
    const session = await register.execute({
      email: 'jordan@example.com',
      password: 'longenough',
    });

    const next = await refresh.execute(session.refreshToken);
    expect(next.refreshToken).toBe('refresh-2');

    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshToken);

    const leftover = await refreshTokens.findByHash(tokens.hashRefresh(session.refreshToken));
    expect(leftover?.isRevoked).toBe(true);
  });

  it('revokes every session when a revoked refresh token is reused', async () => {
    const { register, refresh, tokens, refreshTokens } = auth();
    const session = await register.execute({
      email: 'jordan@example.com',
      password: 'longenough',
    });
    const next = await refresh.execute(session.refreshToken);

    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshToken);
    await expect(refresh.execute(next.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshToken);

    const rotated = await refreshTokens.findByHash(tokens.hashRefresh(next.refreshToken));
    expect(rotated?.isRevoked).toBe(true);
  });

  it('logout is idempotent and blocks later refresh', async () => {
    const { register, logout, refresh } = auth();
    const session = await register.execute({
      email: 'jordan@example.com',
      password: 'longenough',
    });

    await logout.execute(session.refreshToken);
    await logout.execute(session.refreshToken);
    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(InvalidRefreshToken);
  });
});
