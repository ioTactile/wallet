import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateAccountBody, UpdateAccountBody } from '@wallet/shared';

import { accountUseCases, bankUseCases } from '@/application/use-cases';
import { accountQueryKeys } from '@/infrastructure/account-query-keys';
import { recordQueryKeys } from '@/infrastructure/record-query-keys';

export function useAccountList(includeArchived = false) {
  return useQuery({
    queryKey: accountQueryKeys.list(includeArchived),
    queryFn: () => accountUseCases.list.execute({ includeArchived }),
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: accountQueryKeys.detail(id),
    queryFn: () => accountUseCases.get.execute(id),
    enabled: id.length > 0,
  });
}

function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
}

export function useCreateCashAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (body: Omit<Extract<CreateAccountBody, { kind: 'cash' }>, 'kind'>) =>
      accountUseCases.createCash.execute(body),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAccountBody }) =>
      accountUseCases.update.execute(id, body),
    onSuccess: () => invalidate(),
  });
}

export function useArchiveAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      accountUseCases.archive.execute(id, archived),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteAccount() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (id: string) => accountUseCases.delete.execute(id),
    onSuccess: () => invalidate(),
  });
}

function useInvalidateLedger() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: accountQueryKeys.all });
    void queryClient.invalidateQueries({ queryKey: recordQueryKeys.all });
  };
}

export function useConnectBank() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: () => bankUseCases.connectDemo.execute(),
    onSuccess: () => invalidate(),
  });
}

export function useCompleteBankConnection() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (connectionId: string) => bankUseCases.complete.execute(connectionId),
    onSuccess: () => invalidate(),
  });
}

export function useSyncBankAccount() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (id: string) => bankUseCases.sync.execute(id),
    onSuccess: () => invalidate(),
  });
}

export function useDisconnectBankAccount() {
  const invalidate = useInvalidateLedger();
  return useMutation({
    mutationFn: (id: string) => bankUseCases.disconnect.execute(id),
    onSuccess: () => invalidate(),
  });
}
