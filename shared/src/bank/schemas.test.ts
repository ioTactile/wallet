import { describe, expect, it } from 'vitest';

import {
  enableBankingReturnQuerySchema,
  gocardlessReturnQuerySchema,
  isAllowedBankRedirectUri,
  sandboxAuthorizeQuerySchema,
  startBankConnectionBodySchema,
  startBankConnectionResponseSchema,
  syncBankAccountResponseSchema,
} from './schemas.js';

describe('bank schemas', () => {
  it('accepts only allowed bank redirect URIs', () => {
    expect(isAllowedBankRedirectUri('mobile://bank/callback')).toBe(true);
    expect(isAllowedBankRedirectUri('exp://127.0.0.1:8081/--/bank/callback')).toBe(true);
    expect(isAllowedBankRedirectUri('http://localhost:8081/bank-callback.html')).toBe(true);
    expect(isAllowedBankRedirectUri('https://app.example/bank-callback.html')).toBe(true);
    expect(isAllowedBankRedirectUri('https://attacker.example/cb')).toBe(false);
    expect(isAllowedBankRedirectUri('javascript:alert(1)')).toBe(false);
    expect(isAllowedBankRedirectUri('https://evil@localhost/bank-callback.html')).toBe(false);
  });

  it('accepts a start payload with a custom-scheme redirect', () => {
    expect(
      startBankConnectionBodySchema.parse({ redirectUri: '  mobile://bank/callback ' }),
    ).toEqual({ redirectUri: 'mobile://bank/callback' });
    expect(() => startBankConnectionBodySchema.parse({})).toThrow();
    expect(() => startBankConnectionBodySchema.parse({ redirectUri: 'x', extra: 1 })).toThrow();
    expect(() =>
      startBankConnectionBodySchema.parse({ redirectUri: 'https://attacker.example/' }),
    ).toThrow();
  });

  it('parses start and sync responses', () => {
    const started = startBankConnectionResponseSchema.parse({
      id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
      authorizationUrl: 'http://127.0.0.1:3000/bank/sandbox/authorize?connectionId=x',
    });
    expect(started.id).toBe('3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12');
    expect(syncBankAccountResponseSchema.parse({ importedCount: 8 })).toEqual({ importedCount: 8 });
    expect(() => syncBankAccountResponseSchema.parse({ importedCount: -1 })).toThrow();
  });

  it('parses the sandbox authorize query without redirect_uri', () => {
    expect(sandboxAuthorizeQuerySchema.parse({ connectionId: 'link-1' })).toEqual({
      connectionId: 'link-1',
    });
    expect(() =>
      sandboxAuthorizeQuerySchema.parse({
        connectionId: 'link-1',
        redirect_uri: 'https://attacker.example/',
      }),
    ).toThrow();
  });

  it('accepts GoCardless ref as the connection id without redirect_uri', () => {
    expect(gocardlessReturnQuerySchema.parse({ ref: 'link-1' })).toEqual({
      connectionId: 'link-1',
    });
    expect(() => gocardlessReturnQuerySchema.parse({})).toThrow();
    expect(() =>
      gocardlessReturnQuerySchema.parse({
        connectionId: 'link-1',
        redirect_uri: 'https://attacker.example/',
      }),
    ).toThrow();
  });

  it('parses the Enable Banking return query', () => {
    expect(
      enableBankingReturnQuerySchema.parse({
        code: 'auth-code',
        state: 'abc',
      }),
    ).toEqual({
      code: 'auth-code',
      state: 'abc',
    });
    expect(() => enableBankingReturnQuerySchema.parse({})).toThrow();
  });
});
