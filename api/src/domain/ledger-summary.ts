import type { LedgerRecord } from './record.js';

export type ListedRecords = {
  records: LedgerRecord[];
  openingBalanceCents: number;
  periodNetCents: number;
};

export function signedAmountForAccount(record: LedgerRecord, accountId: string): number {
  if (record.kind === 'expense' && record.accountId === accountId) {
    return -record.amountCents;
  }
  if (record.kind === 'income' && record.accountId === accountId) {
    return record.amountCents;
  }
  if (record.kind === 'transfer') {
    if (record.accountId === accountId) {
      return -record.amountCents;
    }
    if (record.counterpartyAccountId === accountId) {
      return record.amountCents;
    }
  }
  return 0;
}

export function ledgerTouchesAccounts(
  record: LedgerRecord,
  accountIds: readonly string[] | undefined,
): boolean {
  if (accountIds == null || accountIds.length === 0) {
    return true;
  }
  const selected = new Set(accountIds);
  if (record.kind === 'transfer') {
    return (
      selected.has(record.accountId) ||
      (record.counterpartyAccountId != null && selected.has(record.counterpartyAccountId))
    );
  }
  return selected.has(record.accountId);
}

export function signedAmountForSelection(
  record: LedgerRecord,
  accountIds: readonly string[] | undefined,
): number {
  if (accountIds == null || accountIds.length === 0) {
    if (record.kind === 'expense') {
      return -record.amountCents;
    }
    if (record.kind === 'income') {
      return record.amountCents;
    }
    return 0;
  }
  let total = 0;
  for (const accountId of accountIds) {
    total += signedAmountForAccount(record, accountId);
  }
  return total;
}

export function summarizeLedgerRecords(
  records: readonly LedgerRecord[],
  from: Date,
  to: Date,
  accountIds?: string[],
): ListedRecords {
  const openingBalanceCents = records
    .filter((record) => record.bookedAt < from && ledgerTouchesAccounts(record, accountIds))
    .reduce((sum, record) => sum + signedAmountForSelection(record, accountIds), 0);

  const inPeriod = records
    .filter(
      (record) =>
        record.bookedAt >= from &&
        record.bookedAt <= to &&
        ledgerTouchesAccounts(record, accountIds),
    )
    .sort((a, b) => b.bookedAt.getTime() - a.bookedAt.getTime() || b.id.localeCompare(a.id));

  const periodNetCents = inPeriod.reduce(
    (sum, record) => sum + signedAmountForSelection(record, accountIds),
    0,
  );

  return { records: inPeriod, openingBalanceCents, periodNetCents };
}

export function accumulateLedgerBalances(records: readonly LedgerRecord[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const record of records) {
    if (record.kind === 'transfer') {
      add(balances, record.accountId, -record.amountCents);
      if (record.counterpartyAccountId) {
        add(balances, record.counterpartyAccountId, record.amountCents);
      }
      continue;
    }
    add(
      balances,
      record.accountId,
      record.kind === 'expense' ? -record.amountCents : record.amountCents,
    );
  }
  return balances;
}

function add(balances: Map<string, number>, accountId: string, delta: number): void {
  balances.set(accountId, (balances.get(accountId) ?? 0) + delta);
}
