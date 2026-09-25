export const accountQueryKeys = {
  all: ['accounts'] as const,
  list: (includeArchived = false) => ['accounts', { includeArchived }] as const,
  detail: (id: string) => ['accounts', id] as const,
};
