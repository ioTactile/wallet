import type { BankConnectionOptions } from '@wallet/shared';

import type { Env } from '../config/env.js';
import type { BankConnection } from '../domain/bank-connection.js';

const SELECT_COUNTRY = 'FR';

export class GetBankConnectionOptions {
  constructor(
    private readonly bank: BankConnection,
    private readonly env: Env,
  ) {}

  execute(): BankConnectionOptions {
    const provider = this.bank.provider;
    if (provider !== 'enablebanking') {
      return { provider, selectUrl: null, country: SELECT_COUNTRY };
    }
    const selectUrl = new URL('/bank/enablebanking/select', this.env.PUBLIC_API_URL).toString();
    return { provider, selectUrl, country: SELECT_COUNTRY };
  }
}
