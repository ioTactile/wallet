import type { Href } from 'expo-router';

export function recordsListHref(accountIds?: string): Href {
  if (accountIds != null && accountIds.length > 0) {
    return { pathname: '/records', params: { accountIds } };
  }
  return '/records';
}

export function recordDetailHref(
  id: string,
  extras?: {
    categoryId?: string;
    kind?: string;
    toAccountId?: string;
    fromAccountId?: string;
  },
): Href {
  const params: { id: string } & Record<string, string> = { id };
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (value != null && value.length > 0) {
        params[key] = value;
      }
    }
  }
  return { pathname: '/records/[id]', params };
}

export function newRecordHref(extras?: { kind?: string; categoryId?: string }): Href {
  return { pathname: '/records/new', params: extras };
}
