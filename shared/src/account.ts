export const ACCOUNT_KINDS = ['cash', 'bank'] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const DEFAULT_CASH_ACCOUNT_ID = 'cash';

export function canSyncFromBank(kind: AccountKind): boolean {
  return kind === 'bank';
}

export function isManualLedger(kind: AccountKind): boolean {
  return kind === 'cash';
}

export function canTransferBetween(fromAccountId: string, toAccountId: string): boolean {
  return fromAccountId !== toAccountId;
}
