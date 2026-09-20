import { describe, expect, it } from '@jest/globals';
import { DEFAULT_ACCOUNT_COLOR } from '@wallet/shared';

import { makeBankAccount, makeCashAccount } from '@/application/fakes';
import { AccountApiError } from '@/domain/ports';

import {
  accountConfirmCopy,
  accountErrorKey,
  dataScreenStatus,
  defaultCashFormValues,
  detailScreenStatus,
  hasUnsavedAccountChanges,
  toAccountRow,
  toCreateCashBody,
  toEditAccountFormValues,
  toUpdateAccountBody,
} from './accounts-view-model';

describe('accounts view-model', () => {
  it('maps an account to a display row with formatted cents and a masked IBAN', () => {
    expect(toAccountRow(makeCashAccount({ balanceCents: 199 }))).toMatchObject({
      id: makeCashAccount().id,
      name: 'Espèces',
      color: DEFAULT_ACCOUNT_COLOR,
      balanceLabel: '1,99 €',
      subtitle: null,
      archived: false,
      kind: 'cash',
    });
    expect(toAccountRow(makeBankAccount()).subtitle).toBe('FR76 •••• 0185');
  });

  it('derives loading, error, empty and content for a list', () => {
    expect(dataScreenStatus({ data: undefined, error: null })).toBe('loading');
    expect(dataScreenStatus({ data: undefined, error: new Error('nope') })).toBe('error');
    expect(dataScreenStatus({ data: [], error: null })).toBe('empty');
    expect(dataScreenStatus({ data: [makeCashAccount()], error: new Error('stale') })).toBe(
      'content',
    );
  });

  it('derives detail screen states', () => {
    expect(detailScreenStatus({ data: undefined, error: null })).toBe('loading');
    expect(detailScreenStatus({ data: undefined, error: new Error('nope') })).toBe('error');
    expect(detailScreenStatus({ data: makeCashAccount(), error: null })).toBe('content');
  });

  it('builds a cash create payload from form strings via the shared schema', () => {
    expect(
      toCreateCashBody({
        ...defaultCashFormValues(),
        name: '  Coffre ',
        minBalance: '0',
        maxBalance: '10',
      }),
    ).toMatchObject({
      kind: 'cash',
      name: 'Coffre',
      color: DEFAULT_ACCOUNT_COLOR,
      minBalanceCents: 0,
      maxBalanceCents: 1000,
    });
  });

  it('builds a PATCH body and detects unsaved edits including archive', () => {
    const account = makeCashAccount({ minBalanceCents: 100 });
    const initial = toEditAccountFormValues(account);
    expect(hasUnsavedAccountChanges(initial, initial)).toBe(false);
    expect(
      hasUnsavedAccountChanges(initial, { ...initial, name: 'Vacances', archived: true }),
    ).toBe(true);
    expect(toUpdateAccountBody({ ...initial, name: 'Vacances' })).toEqual({
      name: 'Vacances',
      color: account.color,
      excludeFromStats: false,
      minBalanceCents: 100,
      maxBalanceCents: null,
    });
  });

  it('maps last-cash deletion to the dedicated copy key', () => {
    expect(accountErrorKey(new AccountApiError('cannot_delete_last_cash_account'), 'delete')).toBe(
      'account.deleteLastCashError',
    );
    expect(accountErrorKey(new Error('nope'), 'save')).toBe('account.saveError');
  });

  it('maps confirmation dialogs to shared copy keys', () => {
    expect(accountConfirmCopy('delete')).toEqual({
      titleKey: 'account.deleteConfirmTitle',
      messageKey: 'account.deleteConfirmMessage',
      cancelKey: 'account.cancel',
      confirmKey: 'account.delete',
    });
    expect(accountConfirmCopy('disconnect')).toEqual({
      titleKey: 'account.disconnectConfirmTitle',
      messageKey: 'account.disconnectConfirmMessage',
      cancelKey: 'account.cancel',
      confirmKey: 'account.disconnect',
    });
    expect(accountConfirmCopy('unsaved')).toEqual({
      titleKey: 'account.unsavedTitle',
      messageKey: 'account.unsavedMessage',
      cancelKey: 'account.unsavedStay',
      confirmKey: 'account.unsavedLeave',
    });
  });
});
