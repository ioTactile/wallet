import { describe, expect, it } from 'vitest';

import { AIS_EXPENSE_CATEGORY_ID, AIS_INCOME_CATEGORY_ID } from '../account.js';
import { bankLabelFingerprint, suggestCategory, type CategoryMemory } from './suggest-category.js';

const ACCOUNT_ID = 'bank-1';

function memory(overrides: Partial<CategoryMemory> = {}): CategoryMemory {
  return {
    accountId: ACCOUNT_ID,
    label: 'VIR INST MLLE QINGLET',
    kind: 'income',
    categoryId: 'income.refunds',
    categoryConfirmed: true,
    ...overrides,
  };
}

describe('bankLabelFingerprint', () => {
  it('keeps the merchant and drops SEPA noise, card masks and single letters', () => {
    expect(bankLabelFingerprint('E.LECLERC CB*0098')).toBe('LECLERC');
    expect(bankLabelFingerprint('PRLV SEPA ALLIANZ I A R 199BH 32152 NK11')).toBe('ALLIANZ');
    expect(bankLabelFingerprint('VIR INST MLLE QINGLET')).toBe('MLLE QINGLET');
    expect(bankLabelFingerprint('  Salaire ')).toBe('SALAIRE');
    expect(bankLabelFingerprint('Café')).toBe('CAFE');
  });
});

describe('suggestCategory', () => {
  it('maps an unambiguous keyword when the kind matches', () => {
    expect(
      suggestCategory({ label: 'E.LECLERC CB*0098', kind: 'expense', accountId: ACCOUNT_ID }),
    ).toBe('food_drinks.groceries');
    expect(suggestCategory({ label: 'Carrefour', kind: 'expense', accountId: ACCOUNT_ID })).toBe(
      'food_drinks.groceries',
    );
    expect(
      suggestCategory({ label: 'PRLV SEPA ALLIANZ', kind: 'expense', accountId: ACCOUNT_ID }),
    ).toBe('financial_expenses.insurances');
    expect(suggestCategory({ label: 'EDF', kind: 'expense', accountId: ACCOUNT_ID })).toBe(
      'housing.energy_utilities',
    );
    expect(suggestCategory({ label: 'Spotify', kind: 'expense', accountId: ACCOUNT_ID })).toBe(
      'life_entertainment.tv_streaming',
    );
    expect(suggestCategory({ label: 'Loyer', kind: 'expense', accountId: ACCOUNT_ID })).toBe(
      'housing.rent',
    );
    expect(suggestCategory({ label: 'Salaire', kind: 'income', accountId: ACCOUNT_ID })).toBe(
      'income.wage_invoices',
    );
    expect(suggestCategory({ label: 'Remboursement', kind: 'income', accountId: ACCOUNT_ID })).toBe(
      'income.refunds',
    );
  });

  it('returns null when the label is unknown, ambiguous, or the keyword kind does not match', () => {
    expect(
      suggestCategory({ label: 'AMAZON PAYMENTS', kind: 'expense', accountId: ACCOUNT_ID }),
    ).toBeNull();
    expect(
      suggestCategory({ label: 'VIR INST MLLE QINGLET', kind: 'income', accountId: ACCOUNT_ID }),
    ).toBeNull();
    expect(
      suggestCategory({ label: 'LECLERC ALLIANZ', kind: 'expense', accountId: ACCOUNT_ID }),
    ).toBeNull();
    expect(
      suggestCategory({ label: 'Salaire', kind: 'expense', accountId: ACCOUNT_ID }),
    ).toBeNull();
    expect(suggestCategory({ label: '   ', kind: 'expense', accountId: ACCOUNT_ID })).toBeNull();
  });

  it('reuses the single confirmed category of the same account and fingerprint', () => {
    expect(
      suggestCategory({
        label: 'VIR INST MLLE QINGLET',
        kind: 'income',
        accountId: ACCOUNT_ID,
        history: [memory()],
      }),
    ).toBe('income.refunds');
  });

  it('prefers a confirmed account memory over the keyword dictionary', () => {
    expect(
      suggestCategory({
        label: 'PRLV SEPA ALLIANZ I A R',
        kind: 'expense',
        accountId: ACCOUNT_ID,
        history: [
          memory({
            label: 'ALLIANZ',
            kind: 'expense',
            categoryId: 'housing.property_insurance',
          }),
        ],
      }),
    ).toBe('housing.property_insurance');
  });

  it('ignores generic, unconfirmed, other-account and other-kind memories', () => {
    const label = 'VIR INST MLLE QINGLET';
    expect(
      suggestCategory({
        label,
        kind: 'income',
        accountId: ACCOUNT_ID,
        history: [memory({ categoryId: AIS_INCOME_CATEGORY_ID })],
      }),
    ).toBeNull();
    expect(
      suggestCategory({
        label,
        kind: 'expense',
        accountId: ACCOUNT_ID,
        history: [memory({ kind: 'expense', categoryId: AIS_EXPENSE_CATEGORY_ID })],
      }),
    ).toBeNull();
    expect(
      suggestCategory({
        label,
        kind: 'income',
        accountId: ACCOUNT_ID,
        history: [memory({ categoryConfirmed: false })],
      }),
    ).toBeNull();
    expect(
      suggestCategory({
        label,
        kind: 'income',
        accountId: ACCOUNT_ID,
        history: [memory({ accountId: 'bank-2' })],
      }),
    ).toBeNull();
    expect(
      suggestCategory({
        label,
        kind: 'income',
        accountId: ACCOUNT_ID,
        history: [memory({ kind: 'expense', categoryId: 'food_drinks.groceries' })],
      }),
    ).toBeNull();
  });

  it('skips an ambiguous memory and falls through to the dictionary', () => {
    expect(
      suggestCategory({
        label: 'E.LECLERC CB*0102',
        kind: 'expense',
        accountId: ACCOUNT_ID,
        history: [
          memory({ label: 'LECLERC', kind: 'expense', categoryId: 'food_drinks.groceries' }),
          memory({
            label: 'E.LECLERC CB*0098',
            kind: 'expense',
            categoryId: 'shopping.home_garden',
          }),
        ],
      }),
    ).toBe('food_drinks.groceries');
  });

  it('returns null when an ambiguous memory has no keyword either', () => {
    expect(
      suggestCategory({
        label: 'VIR INST MLLE QINGLET',
        kind: 'income',
        accountId: ACCOUNT_ID,
        history: [memory({ categoryId: 'income.refunds' }), memory({ categoryId: 'income.gifts' })],
      }),
    ).toBeNull();
  });
});
