import { describe, expect, it } from 'vitest';

import { testEnv } from '../config/env.js';
import { FakeBankConnection } from './fake-bank-connection.js';
import { GetBankConnectionOptions } from './get-bank-connection-options.js';

describe('GetBankConnectionOptions', () => {
  it('returns a null select URL for sandbox', () => {
    const bank = new FakeBankConnection('http://127.0.0.1:3000');
    const options = new GetBankConnectionOptions(bank, testEnv()).execute();
    expect(options).toEqual({
      provider: 'sandbox',
      selectUrl: null,
      country: 'FR',
    });
  });

  it('returns the Enable Banking select page URL', () => {
    const bank = Object.assign(new FakeBankConnection('http://127.0.0.1:3000'), {
      provider: 'enablebanking' as const,
    });
    const options = new GetBankConnectionOptions(
      bank,
      testEnv({ PUBLIC_API_URL: 'http://127.0.0.1:3000', BANK_PROVIDER: 'enablebanking' }),
    ).execute();
    expect(options).toEqual({
      provider: 'enablebanking',
      selectUrl: 'http://127.0.0.1:3000/bank/enablebanking/select',
      country: 'FR',
    });
  });
});
