import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateRecordBody, UpdateRecordBody } from '@wallet/shared';

import { recordUseCases } from '@/application/use-cases';
import type { ListRecordsOptions } from '@/domain/ports';
import { accountQueryKeys } from '@/infrastructure/account-query-keys';
import { recordQueryKeys } from '@/infrastructure/record-query-keys';

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
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRecordBody }) =>
      recordUseCases.update.execute(id, body),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteRecord() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (id: string) => recordUseCases.delete.execute(id),
    onSuccess: () => invalidate(),
  });
}
