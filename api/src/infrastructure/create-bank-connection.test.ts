import { describe, expect, it } from 'vitest';

import { FakeBankConnection } from '../application/fake-bank-connection.js';
import { loadEnv, testEnv } from '../config/env.js';
import { createBankConnection } from './create-bank-connection.js';
import { EnableBankingBankConnection } from './enablebanking-bank-connection.js';
import { GoCardlessBankConnection } from './gocardless-bank-connection.js';

describe('createBankConnection', () => {
  it('uses the sandbox adapter by default', () => {
    expect(createBankConnection(testEnv())).toBeInstanceOf(FakeBankConnection);
    expect(createBankConnection(testEnv()).provider).toBe('sandbox');
  });

  it('uses GoCardless when BANK_PROVIDER is gocardless', () => {
    const bank = createBankConnection(
      testEnv({
        BANK_PROVIDER: 'gocardless',
        GOCARDLESS_SECRET_ID: 'id',
        GOCARDLESS_SECRET_KEY: 'key',
      }),
    );
    expect(bank).toBeInstanceOf(GoCardlessBankConnection);
    expect(bank.provider).toBe('gocardless');
  });

  it('uses Enable Banking when BANK_PROVIDER is enablebanking', () => {
    const bank = createBankConnection(
      testEnv({
        BANK_PROVIDER: 'enablebanking',
        ENABLEBANKING_APPLICATION_ID: 'app-1',
        ENABLEBANKING_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
      }),
    );
    expect(bank).toBeInstanceOf(EnableBankingBankConnection);
    expect(bank.provider).toBe('enablebanking');
  });
});

describe('loadEnv bank provider', () => {
  const base = {
    JWT_SECRET: 'test-secret-at-least-32-characters!',
  };

  it('defaults to sandbox without aggregator secrets', () => {
    expect(loadEnv(base).BANK_PROVIDER).toBe('sandbox');
    expect(
      loadEnv({ ...base, GOCARDLESS_SECRET_ID: '', GOCARDLESS_SECRET_KEY: '  ' })
        .GOCARDLESS_SECRET_ID,
    ).toBeUndefined();
  });

  it('requires GoCardless secrets for the real provider', () => {
    expect(() => loadEnv({ ...base, BANK_PROVIDER: 'gocardless' })).toThrow();
    expect(
      loadEnv({
        ...base,
        BANK_PROVIDER: 'gocardless',
        GOCARDLESS_SECRET_ID: 'id',
        GOCARDLESS_SECRET_KEY: 'key',
      }).GOCARDLESS_INSTITUTION_ID,
    ).toBe('BOURSORAMA_BOUSFRPPXXX');
  });

  it('requires Enable Banking credentials for the real provider', () => {
    expect(() => loadEnv({ ...base, BANK_PROVIDER: 'enablebanking' })).toThrow();
    expect(
      loadEnv({
        ...base,
        BANK_PROVIDER: 'enablebanking',
        ENABLEBANKING_APPLICATION_ID: 'app-1',
        ENABLEBANKING_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----',
      }).ENABLEBANKING_ASPSP_NAME,
    ).toBe('Boursorama Banque');
  });
});
