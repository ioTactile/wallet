import { accumulateBalances } from '@wallet/shared';

import type { RecordRepository } from '../domain/ports.js';
import { mapRecord } from './map-record.js';

export class GetAccountBalances {
  constructor(private readonly records: RecordRepository) {}

  async execute(userId: string): Promise<Map<string, number>> {
    const mapped = (await this.records.listByUser(userId)).map(mapRecord);
    return accumulateBalances(mapped);
  }
}
