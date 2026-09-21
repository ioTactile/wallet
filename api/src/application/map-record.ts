import {
  recordTouchesAccounts,
  signedAmountForSelection,
  type Record as RecordDto,
} from '@wallet/shared';

import type { LedgerRecord } from '../domain/record.js';

export function mapRecord(record: LedgerRecord): RecordDto {
  const base = {
    id: record.id,
    userId: record.userId,
    amountCents: record.amountCents,
    currency: 'EUR' as const,
    bookedAt: record.bookedAt.toISOString(),
    clearing: record.clearing,
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

export function summarizeRecords(
  records: readonly RecordDto[],
  from: string,
  to: string,
  accountIds?: string[],
): { records: RecordDto[]; openingBalanceCents: number; periodNetCents: number } {
  const openingBalanceCents = records
    .filter((record) => record.bookedAt < from && recordTouchesAccounts(record, accountIds))
    .reduce((sum, record) => sum + signedAmountForSelection(record, accountIds), 0);

  const inPeriod = records
    .filter(
      (record) =>
        record.bookedAt >= from &&
        record.bookedAt <= to &&
        recordTouchesAccounts(record, accountIds),
    )
    .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt) || b.id.localeCompare(a.id));

  const periodNetCents = inPeriod.reduce(
    (sum, record) => sum + signedAmountForSelection(record, accountIds),
    0,
  );

  return { records: inPeriod, openingBalanceCents, periodNetCents };
}
