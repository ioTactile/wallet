export const LOCALES = ['fr', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export function resolveLocale(languageTag: string | null | undefined): Locale {
  const tag = languageTag?.toLowerCase() ?? '';
  if (tag.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}
