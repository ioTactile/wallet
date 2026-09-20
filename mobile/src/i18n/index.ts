import { DEFAULT_LOCALE, i18nResources, resolveLocale } from '@wallet/shared';
import { getLocales } from 'expo-localization';
import i18n, { use as applyPlugin } from 'i18next';
import { initReactI18next } from 'react-i18next';

export function initI18n() {
  if (i18n.isInitialized) {
    return i18n;
  }

  const languageTag = getLocales()[0]?.languageTag;

  void applyPlugin(initReactI18next).init({
    lng: resolveLocale(languageTag),
    fallbackLng: DEFAULT_LOCALE,
    resources: i18nResources(),
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

  return i18n;
}

initI18n();

export default i18n;
