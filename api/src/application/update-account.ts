import type { Account } from '../domain/account.js';
import { AccountNotFound } from '../domain/errors.js';
import type { AccountRepository, Clock } from '../domain/ports.js';

export type UpdateAccountInput = {
  name?: string;
  color?: string;
  excludeFromStats?: boolean;
  minBalanceCents?: number | null;
  maxBalanceCents?: number | null;
  iban?: string | null;
  institutionName?: string | null;
};

export class UpdateAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, accountId: string, input: UpdateAccountInput): Promise<Account> {
    const account = await this.accounts.getById(accountId);
    if (!account || account.userId !== userId) {
      throw new AccountNotFound();
    }

    const now = this.clock.now();
    let updated = account;
    if (input.name !== undefined) {
      updated = updated.rename(input.name, now);
    }
    if (input.color !== undefined) {
      updated = updated.recolor(input.color, now);
    }
    if (input.excludeFromStats !== undefined) {
      updated = updated.setExcludeFromStats(input.excludeFromStats, now);
    }
    if (input.minBalanceCents !== undefined || input.maxBalanceCents !== undefined) {
      updated = updated.setBalanceAlerts(
        input.minBalanceCents !== undefined ? input.minBalanceCents : updated.minBalanceCents,
        input.maxBalanceCents !== undefined ? input.maxBalanceCents : updated.maxBalanceCents,
        now,
      );
    }
    if (input.iban !== undefined || input.institutionName !== undefined) {
      updated = updated.setBankDetails(
        input.iban !== undefined ? input.iban : updated.iban,
        input.institutionName !== undefined ? input.institutionName : updated.institutionName,
        now,
      );
    }

    await this.accounts.save(updated);
    return updated;
  }
}
