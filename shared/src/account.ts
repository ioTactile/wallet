export const ACCOUNT_KINDS = ['cash', 'bank'] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

/** Legacy token for the default cash ledger. Not a persisted account UUID. */
export const DEFAULT_CASH_ACCOUNT_ID = 'cash';

export const DEFAULT_ACCOUNT_CURRENCY = 'EUR';

export const ACCOUNT_COLORS = [
  '#66BB6A',
  '#42A5F5',
  '#FFA726',
  '#EC407A',
  '#AB47BC',
  '#26A69A',
  '#EF5350',
  '#5C6BC0',
] as const;

export type AccountColor = (typeof ACCOUNT_COLORS)[number];

export const DEFAULT_ACCOUNT_COLOR: AccountColor = ACCOUNT_COLORS[0];

export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX_COLOR_PATTERN.test(value);
}

export function canSyncFromBank(kind: AccountKind): boolean {
  return kind === 'bank';
}

export function isManualLedger(kind: AccountKind): boolean {
  return kind === 'cash';
}

export function canTransferBetween(fromAccountId: string, toAccountId: string): boolean {
  return fromAccountId !== toAccountId;
}
