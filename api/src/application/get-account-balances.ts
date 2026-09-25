import type { RecordRepository } from '../domain/ports.js';
import { accumulateLedgerBalances } from '../domain/ledger-summary.js';

export class GetAccountBalances {
  constructor(private readonly records: RecordRepository) {}

  async execute(userId: string): Promise<Map<string, number>> {
    return accumulateLedgerBalances(await this.records.listByUser(userId));
  }
}
