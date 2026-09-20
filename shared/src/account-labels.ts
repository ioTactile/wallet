import type { Locale } from './locale.js';
import type { AccountKind } from './account.js';

export const ACCOUNT_KIND_LABELS: Record<Locale, Record<AccountKind, string>> = {
  fr: {
    cash: 'Espèces',
    bank: 'Banque',
  },
  en: {
    cash: 'Cash',
    bank: 'Bank',
  },
};

export function accountKindLabel(kind: AccountKind, locale: Locale): string {
  return ACCOUNT_KIND_LABELS[locale][kind];
}
