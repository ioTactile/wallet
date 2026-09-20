import { describe, expect, it } from 'vitest';

import {
  authUserSchema,
  loginBodySchema,
  registerBodySchema,
  refreshBodySchema,
  updateProfileBodySchema,
} from './schemas.js';

describe('auth contracts', () => {
  it('normalizes email and rejects a short password', () => {
    const parsed = registerBodySchema.parse({
      email: '  Jordan@Example.com ',
      password: 'longenough',
    });
    expect(parsed.email).toBe('jordan@example.com');
    expect(() => loginBodySchema.parse({ email: 'a@b.c', password: 'short' })).toThrow();
  });

  it('requires a refresh token', () => {
    expect(() => refreshBodySchema.parse({ refreshToken: '' })).toThrow();
  });

  it('defaults missing profile names and trims updates', () => {
    const user = authUserSchema.parse({
      id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
      email: 'jordan@example.com',
    });
    expect(user.firstName).toBe('');
    expect(user.lastName).toBe('');

    const profile = updateProfileBodySchema.parse({
      firstName: '  Jordan ',
      lastName: '  Dupont ',
    });
    expect(profile).toEqual({ firstName: 'Jordan', lastName: 'Dupont' });
    expect(() =>
      updateProfileBodySchema.parse({
        firstName: 'x'.repeat(101),
        lastName: 'Ok',
      }),
    ).toThrow();
  });
});
