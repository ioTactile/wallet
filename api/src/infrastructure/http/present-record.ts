import {
  recordSchema,
  recordsResponseSchema,
  type Record as RecordDto,
  type RecordsResponse,
} from '@wallet/shared';

import type { ListedRecords } from '../../domain/ledger-summary.js';
import type { LedgerRecord } from '../../domain/record.js';

export function mapRecord(record: LedgerRecord): RecordDto {
  const base = {
    id: record.id,
    userId: record.userId,
    amountCents: record.amountCents,
    currency: 'EUR' as const,
    bookedAt: record.bookedAt.toISOString(),
    clearing: record.clearing,
    categoryConfirmed: record.categoryConfirmed,
    note: record.note,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };

  if (record.kind === 'transfer') {
    return {
      ...base,
      kind: 'transfer',
      fromAccountId: record.accountId,
      toAccountId: record.counterpartyAccountId as string,
    };
  }

  return {
    ...base,
    kind: record.kind,
    accountId: record.accountId,
    categoryId: record.categoryId as string,
  };
}

export function presentRecord(record: LedgerRecord): RecordDto {
  return recordSchema.parse(mapRecord(record));
}

export function presentListedRecords(listed: ListedRecords): RecordsResponse {
  return recordsResponseSchema.parse({
    records: listed.records.map(mapRecord),
    openingBalanceCents: listed.openingBalanceCents,
    periodNetCents: listed.periodNetCents,
  });
}
