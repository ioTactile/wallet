import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AspspRef } from '@wallet/shared';

import { bankUseCases } from '@/application/use-cases';
import { accountQueryKeys } from '@/infrastructure/account-query-keys';
import { bankQueryKeys } from '@/infrastructure/bank-query-keys';
import { recordQueryKeys } from '@/infrastructure/record-query-keys';

export function useBankConnectionOptions() {
  return useQuery({
    queryKey: bankQueryKeys.connectionOptions(),
    queryFn: () => bankUseCases.connectionOptions.execute(),
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
    mutationFn: (aspsp?: AspspRef) => bankUseCases.connect.execute(aspsp),
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
