import { describe, expect, it } from 'vitest';

import {
  sandboxAuthorizeQuerySchema,
  startBankConnectionBodySchema,
  startBankConnectionResponseSchema,
  syncBankAccountResponseSchema,
} from './schemas.js';

describe('bank schemas', () => {
  it('accepts a start payload with a custom-scheme redirect', () => {
    expect(
      startBankConnectionBodySchema.parse({ redirectUri: '  mobile://bank/callback ' }),
    ).toEqual({ redirectUri: 'mobile://bank/callback' });
    expect(() => startBankConnectionBodySchema.parse({})).toThrow();
    expect(() => startBankConnectionBodySchema.parse({ redirectUri: 'x', extra: 1 })).toThrow();
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

  it('parses the sandbox authorize query', () => {
    expect(
      sandboxAuthorizeQuerySchema.parse({
        connectionId: 'link-1',
        redirect_uri: 'mobile://bank/callback',
      }),
    ).toEqual({
      connectionId: 'link-1',
      redirect_uri: 'mobile://bank/callback',
    });
  });
});
