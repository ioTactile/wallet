import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, resolveLocale } from '../locale.js';
import { RECORD_KINDS } from '../record.js';
import { CATEGORIES, categoriesFor, getCategory, listChildren, listRoots } from './catalog.js';
import { CATEGORY_LABELS, categoryLabel } from './labels.js';

const ROOT_IDS = [
  'food_drinks',
  'shopping',
  'housing',
  'transportation',
  'vehicle',
  'life_entertainment',
  'communication_pc',
  'financial_expenses',
  'investments',
  'income',
  'others',
] as const;

const CHILD_COUNTS: Record<(typeof ROOT_IDS)[number], number> = {
  food_drinks: 3,
  shopping: 11,
  housing: 6,
  transportation: 4,
  vehicle: 6,
  life_entertainment: 13,
  communication_pc: 4,
  financial_expenses: 7,
  investments: 5,
  income: 11,
  others: 1,
};

describe('category catalog', () => {
  it('exposes the 11 roots from the product screens', () => {
    expect(listRoots().map((category) => category.id)).toEqual([...ROOT_IDS]);
  });

  it('keeps unique ids and the expected child counts', () => {
    const ids = CATEGORIES.map((category) => category.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const rootId of ROOT_IDS) {
      expect(listChildren(rootId)).toHaveLength(CHILD_COUNTS[rootId]);
    }
  });

  it('namespaces child ids so lottery and child_support can exist twice', () => {
    expect(getCategory('income.lottery_gambling')?.parentId).toBe('income');
    expect(getCategory('life_entertainment.lottery_gambling')?.parentId).toBe('life_entertainment');
    expect(getCategory('income.child_support')?.kind).toBe('income');
    expect(getCategory('financial_expenses.child_support')?.kind).toBe('expense');
  });

  it('does not attach categories to transfers', () => {
    expect(categoriesFor('transfer')).toEqual([]);
    expect(categoriesFor('income').every((category) => category.kind === 'income')).toBe(true);
    expect(categoriesFor('expense').some((category) => category.id === 'income')).toBe(false);
  });

  it('has a fr and en label for every category', () => {
    for (const category of CATEGORIES) {
      expect(CATEGORY_LABELS.fr[category.id]).toBeTruthy();
      expect(CATEGORY_LABELS.en[category.id]).toBeTruthy();
      expect(categoryLabel(category.id, 'fr')).not.toBe(category.id);
    }
  });
});

describe('locale', () => {
  it('defaults to French', () => {
    expect(DEFAULT_LOCALE).toBe('fr');
    expect(resolveLocale(undefined)).toBe('fr');
    expect(resolveLocale('de-DE')).toBe('fr');
    expect(resolveLocale('en-GB')).toBe('en');
  });

  it('keeps record kinds as expense, income and transfer', () => {
    expect(RECORD_KINDS).toEqual(['expense', 'income', 'transfer']);
  });
});
