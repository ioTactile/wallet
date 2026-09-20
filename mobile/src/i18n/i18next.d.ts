import type { i18nResources } from '@wallet/shared';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: ReturnType<typeof i18nResources>['fr'];
  }
}
