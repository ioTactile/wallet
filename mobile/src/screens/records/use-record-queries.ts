import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateRecordBody,
  Record as WalletRecord,
  RecordsResponse,
  UpdateRecordBody,
} from '@wallet/shared';

import { recordUseCases } from '@/application/use-cases';
import type { ListRecordsOptions } from '@/domain/list-options';
import { accountQueryKeys } from '@/screens/accounts/account-query-keys';
import { recordQueryKeys } from '@/screens/records/record-query-keys';

export function useRecordList(options: ListRecordsOptions) {
  return useQuery({
    queryKey: recordQueryKeys.list(options.from, options.to, options.accountIds),
    queryFn: () => recordUseCases.list.execute(options),
  });
}

export function useRecord(id: string) {
  return useQuery({
    queryKey: recordQueryKeys.detail(id),
    queryFn: () => recordUseCases.get.execute(id),
    enabled: id.length > 0,
  });
}

function useInvalidateLedger() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: recordQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
  };
}

export function useCreateRecord() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (body: CreateRecordBody) => recordUseCases.create.execute(body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRecordBody }) =>
      recordUseCases.update.execute(id, body),
    onMutate: async ({ id, body }) => {
      if (body.categoryConfirmed === undefined) {
        return undefined;
      }
      await queryClient.cancelQueries({ queryKey: recordQueryKeys.all });
      const previous = queryClient.getQueriesData({ queryKey: recordQueryKeys.all });
      for (const [key, data] of previous) {
        queryClient.setQueryData(key, patchCategoryConfirmed(data, id, body.categoryConfirmed));
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => invalidate(),
  });
}

export function useDeleteRecord() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (id: string) => recordUseCases.delete.execute(id),
    onSuccess: () => invalidate(),
  });
}

function patchCategoryConfirmed(data: unknown, id: string, categoryConfirmed: boolean): unknown {
  if (data == null || typeof data !== 'object') {
    return data;
  }
  if ('records' in data) {
    const payload = data as RecordsResponse;
    return {
      ...payload,
      records: payload.records.map((record) =>
        record.id === id ? withCategoryConfirmed(record, categoryConfirmed) : record,
      ),
    };
  }
  if ('id' in data && (data as WalletRecord).id === id) {
    return withCategoryConfirmed(data as WalletRecord, categoryConfirmed);
  }
  return data;
}

function withCategoryConfirmed(record: WalletRecord, categoryConfirmed: boolean): WalletRecord {
  return { ...record, categoryConfirmed };
}
