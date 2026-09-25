import type { BankConnectionOptions } from '@wallet/shared';

import type { BankConnection } from '../domain/bank-connection.js';

const SELECT_COUNTRY = 'FR';

export class GetBankConnectionOptions {
  constructor(
    private readonly bank: BankConnection,
    private readonly publicApiUrl: string,
  ) {}

  execute(): BankConnectionOptions {
    const provider = this.bank.provider;
    if (provider !== 'enablebanking') {
      return { provider, selectUrl: null, country: SELECT_COUNTRY };
    }
    const selectUrl = new URL('/bank/enablebanking/select', this.publicApiUrl).toString();
    return { provider, selectUrl, country: SELECT_COUNTRY };
  }
}
