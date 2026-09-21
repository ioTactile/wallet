import type { Record } from './schemas.js';

export function signedAmountForAccount(record: Record, accountId: string): number {
  if (record.kind === 'expense' && record.accountId === accountId) {
    return -record.amountCents;
  }
  if (record.kind === 'income' && record.accountId === accountId) {
    return record.amountCents;
  }
  if (record.kind === 'transfer') {
    if (record.fromAccountId === accountId) {
      return -record.amountCents;
    }
    if (record.toAccountId === accountId) {
      return record.amountCents;
    }
  }
  return 0;
}

export function recordTouchesAccounts(
  record: Record,
  accountIds: readonly string[] | undefined,
): boolean {
  if (accountIds == null || accountIds.length === 0) {
    return true;
  }
  const selected = new Set(accountIds);
  if (record.kind === 'transfer') {
    return selected.has(record.fromAccountId) || selected.has(record.toAccountId);
  }
  return selected.has(record.accountId);
}

export function signedAmountForSelection(
  record: Record,
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

export function accumulateBalances(records: readonly Record[]): Map<string, number> {
  const balances = new Map<string, number>();
  for (const record of records) {
    if (record.kind === 'transfer') {
      add(balances, record.fromAccountId, -record.amountCents);
      add(balances, record.toAccountId, record.amountCents);
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
