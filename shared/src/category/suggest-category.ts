import { AIS_EXPENSE_CATEGORY_ID, AIS_INCOME_CATEGORY_ID } from '../account.js';
import type { RecordKind } from '../record.js';
import { getCategory } from './catalog.js';

const NOISE = new Set([
  'PRLV',
  'SEPA',
  'VIR',
  'INST',
  'CB',
  'PRELEVEMENT',
  'VIREMENT',
  'PAIEMENT',
  'CARTE',
  'TIP',
  'PAYMENT',
  'PAYMENTS',
]);

const GENERIC_CATEGORY_IDS = new Set([AIS_EXPENSE_CATEGORY_ID, AIS_INCOME_CATEGORY_ID]);

/** Unambiguous merchant or wording → catalog category. Conflicts yield no suggestion. */
const KEYWORDS: Record<string, string> = {
  LECLERC: 'food_drinks.groceries',
  CARREFOUR: 'food_drinks.groceries',
  AUCHAN: 'food_drinks.groceries',
  LIDL: 'food_drinks.groceries',
  INTERMARCHE: 'food_drinks.groceries',
  MONOPRIX: 'food_drinks.groceries',
  FRANPRIX: 'food_drinks.groceries',
  PICARD: 'food_drinks.groceries',
  ALDI: 'food_drinks.groceries',
  RESTAURANT: 'food_drinks.restaurant_fast_food',
  MCDONALD: 'food_drinks.restaurant_fast_food',
  MCDONALDS: 'food_drinks.restaurant_fast_food',
  KFC: 'food_drinks.restaurant_fast_food',
  UBEREATS: 'food_drinks.restaurant_fast_food',
  DELIVEROO: 'food_drinks.restaurant_fast_food',
  CAFE: 'food_drinks.bar_cafe',
  STARBUCKS: 'food_drinks.bar_cafe',
  EDF: 'housing.energy_utilities',
  ENGIE: 'housing.energy_utilities',
  ENEDIS: 'housing.energy_utilities',
  LOYER: 'housing.rent',
  ALLIANZ: 'financial_expenses.insurances',
  MAIF: 'financial_expenses.insurances',
  MACIF: 'financial_expenses.insurances',
  AXA: 'financial_expenses.insurances',
  GROUPAMA: 'financial_expenses.insurances',
  MMA: 'financial_expenses.insurances',
  GENERALI: 'financial_expenses.insurances',
  MATMUT: 'financial_expenses.insurances',
  SPOTIFY: 'life_entertainment.tv_streaming',
  NETFLIX: 'life_entertainment.tv_streaming',
  DISNEY: 'life_entertainment.tv_streaming',
  SALAIRE: 'income.wage_invoices',
  PAIE: 'income.wage_invoices',
  PAYE: 'income.wage_invoices',
  REMBOURSEMENT: 'income.refunds',
};

export type CategoryMemory = {
  accountId: string;
  label: string;
  kind: Exclude<RecordKind, 'transfer'>;
  categoryId: string;
  categoryConfirmed: boolean;
};

export type SuggestCategoryInput = {
  label: string;
  kind: Exclude<RecordKind, 'transfer'>;
  accountId: string;
  history?: readonly CategoryMemory[];
};

export function bankLabelFingerprint(label: string): string {
  const folded = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
  return folded
    .split(/\s+/)
    .filter((token) => token.length > 1 && !/\d/.test(token) && !NOISE.has(token))
    .join(' ');
}

export function suggestCategory(input: SuggestCategoryInput): string | null {
  const fingerprint = bankLabelFingerprint(input.label);
  if (fingerprint.length === 0) {
    return null;
  }
  const remembered = categoryFromMemory(fingerprint, input);
  if (remembered != null) {
    return remembered;
  }
  return categoryFromKeywords(fingerprint, input.kind);
}

function categoryFromMemory(fingerprint: string, input: SuggestCategoryInput): string | null {
  const categories = new Set<string>();
  for (const entry of input.history ?? []) {
    if (
      !entry.categoryConfirmed ||
      entry.accountId !== input.accountId ||
      entry.kind !== input.kind
    ) {
      continue;
    }
    if (GENERIC_CATEGORY_IDS.has(entry.categoryId)) {
      continue;
    }
    if (getCategory(entry.categoryId)?.kind !== input.kind) {
      continue;
    }
    if (bankLabelFingerprint(entry.label) !== fingerprint) {
      continue;
    }
    categories.add(entry.categoryId);
  }
  if (categories.size !== 1) {
    return null;
  }
  return [...categories][0] ?? null;
}

function categoryFromKeywords(
  fingerprint: string,
  kind: Exclude<RecordKind, 'transfer'>,
): string | null {
  const categories = new Set<string>();
  for (const token of fingerprint.split(' ')) {
    const categoryId = KEYWORDS[token];
    if (categoryId != null && getCategory(categoryId)?.kind === kind) {
      categories.add(categoryId);
    }
  }
  if (categories.size !== 1) {
    return null;
  }
  return [...categories][0] ?? null;
}
