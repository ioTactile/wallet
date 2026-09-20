import { Account } from '../domain/account.js';
import type { AccountRepository, Clock, IdGenerator } from '../domain/ports.js';
import { nextPosition } from './ensure-default-cash-account.js';

export type CreateAccountInput = {
  kind: 'cash' | 'bank';
  name: string;
  currency?: string;
  color?: string;
  excludeFromStats?: boolean;
  minBalanceCents?: number | null;
  maxBalanceCents?: number | null;
  iban?: string | null;
  institutionName?: string | null;
};

export class CreateAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, input: CreateAccountInput): Promise<Account> {
    const now = this.clock.now();
    const existing = await this.accounts.listByUser(userId, { includeArchived: true });
    const common = {
      id: this.ids.generate(),
      userId,
      name: input.name,
      now,
      color: input.color,
      currency: input.currency,
      excludeFromStats: input.excludeFromStats,
      minBalanceCents: input.minBalanceCents ?? null,
      maxBalanceCents: input.maxBalanceCents ?? null,
      position: nextPosition(existing),
    };

    const account =
      input.kind === 'cash'
        ? Account.createCash(common)
        : Account.createBank({
            ...common,
            iban: input.iban ?? null,
            institutionName: input.institutionName ?? null,
          });

    await this.accounts.save(account);
    return account;
  }
}
