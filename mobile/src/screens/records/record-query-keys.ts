export const recordQueryKeys = {
  all: ['records'] as const,
  list: (from: string, to: string, accountIds?: string[]) =>
    ['records', { from, to, accountIds: accountIds ?? [] }] as const,
  detail: (id: string) => ['records', id] as const,
};
