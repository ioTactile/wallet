import { DEFAULT_ACCOUNT_COLOR, DEFAULT_ACCOUNT_CURRENCY, accountKindLabel } from '@wallet/shared';

import { Account } from '../domain/account.js';
import type { AccountRepository, Clock, IdGenerator } from '../domain/ports.js';

export class EnsureDefaultCashAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string): Promise<Account> {
    const existing = await this.accounts.listByUser(userId, { includeArchived: true });
    const cash = existing.find((account) => account.kind === 'cash');
    if (cash) {
      return cash;
    }

    const now = this.clock.now();
    const position = nextPosition(existing);
    const account = Account.createCash({
      id: this.ids.generate(),
      userId,
      name: accountKindLabel('cash', 'fr'),
      now,
      color: DEFAULT_ACCOUNT_COLOR,
      currency: DEFAULT_ACCOUNT_CURRENCY,
      position,
    });
    await this.accounts.save(account);
    return account;
  }
}

export function nextPosition(accounts: readonly Account[]): number {
  return accounts.reduce((max, account) => Math.max(max, account.position), -1) + 1;
}
