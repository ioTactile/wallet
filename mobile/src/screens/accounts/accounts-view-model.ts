import {
  accountNameSchema,
  createAccountBodySchema,
  DEFAULT_ACCOUNT_COLOR,
  hexColorSchema,
  updateAccountBodySchema,
  type Account,
  type CreateAccountBody,
  type UpdateAccountBody,
} from '@wallet/shared';
import { z } from 'zod';

import { maskIban } from '@/domain/iban';
import { centsToInput, formatMoney, parseEurosToCents } from '@/domain/money';
import { AccountApiError, BankApiError } from '@/domain/ports';

export type DataScreenStatus = 'loading' | 'error' | 'empty' | 'content';

export type AccountRowVm = {
  id: string;
  name: string;
  color: string;
  balanceLabel: string;
  subtitle: string | null;
  archived: boolean;
  kind: Account['kind'];
};

export type CashAccountFormValues = {
  name: string;
  color: string;
  excludeFromStats: boolean;
  minBalance: string;
  maxBalance: string;
};

export type EditAccountFormValues = CashAccountFormValues & {
  archived: boolean;
};

export const cashAccountFormSchema = z.object({
  name: accountNameSchema,
  color: hexColorSchema,
  excludeFromStats: z.boolean(),
  minBalance: z.string(),
  maxBalance: z.string(),
});

export const editAccountFormSchema = cashAccountFormSchema.extend({
  archived: z.boolean(),
});

export function dataScreenStatus(input: {
  data: unknown[] | undefined;
  error: unknown;
}): DataScreenStatus {
  if (input.data === undefined) {
    return input.error ? 'error' : 'loading';
  }
  if (input.data.length === 0) {
    return 'empty';
  }
  return 'content';
}

export function detailScreenStatus(input: {
  data: unknown;
  error: unknown;
}): Exclude<DataScreenStatus, 'empty'> {
  if (input.data === undefined) {
    return input.error ? 'error' : 'loading';
  }
  return 'content';
}

export function toAccountRow(account: Account): AccountRowVm {
  return {
    id: account.id,
    name: account.name,
    color: account.color,
    balanceLabel: formatMoney(account.balanceCents),
    subtitle: account.kind === 'bank' && account.iban ? maskIban(account.iban) : null,
    archived: account.archivedAt !== null,
    kind: account.kind,
  };
}

export type HomeAccountGridItem = { type: 'account'; row: AccountRowVm } | { type: 'add' };

export function homeAccountGridItems(accounts: readonly Account[]): HomeAccountGridItem[] {
  const rows = accounts
    .filter((account) => account.archivedAt == null)
    .map((account) => ({ type: 'account' as const, row: toAccountRow(account) }));
  return [...rows, { type: 'add' }];
}

export function defaultCashFormValues(): CashAccountFormValues {
  return {
    name: '',
    color: DEFAULT_ACCOUNT_COLOR,
    excludeFromStats: false,
    minBalance: '',
    maxBalance: '',
  };
}

export function toCreateCashBody(values: CashAccountFormValues): CreateAccountBody {
  return createAccountBodySchema.parse({
    kind: 'cash',
    name: values.name,
    color: values.color,
    excludeFromStats: values.excludeFromStats,
    minBalanceCents: parseEurosToCents(values.minBalance),
    maxBalanceCents: parseEurosToCents(values.maxBalance),
  });
}

export function toEditAccountFormValues(account: Account): EditAccountFormValues {
  return {
    name: account.name,
    color: account.color,
    excludeFromStats: account.excludeFromStats,
    minBalance: centsToInput(account.minBalanceCents),
    maxBalance: centsToInput(account.maxBalanceCents),
    archived: account.archivedAt !== null,
  };
}

export function toUpdateAccountBody(values: EditAccountFormValues): UpdateAccountBody {
  return updateAccountBodySchema.parse({
    name: values.name,
    color: values.color,
    excludeFromStats: values.excludeFromStats,
    minBalanceCents: parseEurosToCents(values.minBalance),
    maxBalanceCents: parseEurosToCents(values.maxBalance),
  });
}

export function hasUnsavedAccountChanges(
  initial: EditAccountFormValues,
  current: EditAccountFormValues,
): boolean {
  return (
    initial.name !== current.name ||
    initial.color !== current.color ||
    initial.excludeFromStats !== current.excludeFromStats ||
    initial.minBalance !== current.minBalance ||
    initial.maxBalance !== current.maxBalance ||
    initial.archived !== current.archived
  );
}

export type AccountConfirmKind = 'delete' | 'disconnect' | 'unsaved';

export type AccountConfirmCopy = {
  titleKey:
    'account.deleteConfirmTitle' | 'account.disconnectConfirmTitle' | 'account.unsavedTitle';
  messageKey:
    'account.deleteConfirmMessage' | 'account.disconnectConfirmMessage' | 'account.unsavedMessage';
  cancelKey: 'account.cancel' | 'account.unsavedStay';
  confirmKey: 'account.delete' | 'account.disconnect' | 'account.unsavedLeave';
};

export function accountConfirmCopy(kind: AccountConfirmKind): AccountConfirmCopy {
  if (kind === 'disconnect') {
    return {
      titleKey: 'account.disconnectConfirmTitle',
      messageKey: 'account.disconnectConfirmMessage',
      cancelKey: 'account.cancel',
      confirmKey: 'account.disconnect',
    };
  }
  if (kind === 'unsaved') {
    return {
      titleKey: 'account.unsavedTitle',
      messageKey: 'account.unsavedMessage',
      cancelKey: 'account.unsavedStay',
      confirmKey: 'account.unsavedLeave',
    };
  }
  return {
    titleKey: 'account.deleteConfirmTitle',
    messageKey: 'account.deleteConfirmMessage',
    cancelKey: 'account.cancel',
    confirmKey: 'account.delete',
  };
}

export function lastSyncedLabel(iso: string | null, locale: string): string | null {
  if (iso == null) {
    return null;
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

export function bankCallbackConnectionId(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw == null) {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function accountErrorKey(
  error: unknown,
  action: 'save' | 'create' | 'delete' | 'archive' | 'sync' | 'disconnect' | 'connect',
):
  | 'account.saveError'
  | 'account.createError'
  | 'account.deleteError'
  | 'account.deleteLastCashError'
  | 'account.archiveError'
  | 'account.syncError'
  | 'account.syncOfflineError'
  | 'account.disconnectError'
  | 'account.connectBankError' {
  const code =
    error instanceof AccountApiError || error instanceof BankApiError ? error.code : null;
  if (code === 'cannot_delete_last_cash_account') {
    return 'account.deleteLastCashError';
  }
  if (code === 'network_error' || error instanceof TypeError) {
    if (action === 'sync' || action === 'connect') {
      return 'account.syncOfflineError';
    }
  }
  if (action === 'create') return 'account.createError';
  if (action === 'delete') return 'account.deleteError';
  if (action === 'archive') return 'account.archiveError';
  if (action === 'sync') return 'account.syncError';
  if (action === 'disconnect') return 'account.disconnectError';
  if (action === 'connect') return 'account.connectBankError';
  return 'account.saveError';
}
