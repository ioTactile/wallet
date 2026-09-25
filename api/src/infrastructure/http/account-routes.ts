import {
  accountSchema,
  accountsResponseSchema,
  archiveAccountBodySchema,
  createAccountBodySchema,
  listAccountsQuerySchema,
  syncBankAccountResponseSchema,
  updateAccountBodySchema,
  type Account as AccountDto,
} from '@wallet/shared';
import type { FastifyInstance } from 'fastify';

import type { ArchiveAccount } from '../../application/archive-account.js';
import type { CreateAccount } from '../../application/create-account.js';
import type { DeleteAccount } from '../../application/delete-account.js';
import type { DisconnectBankAccount } from '../../application/disconnect-bank-account.js';
import type { GetAccount } from '../../application/get-account.js';
import type { GetAccountBalances } from '../../application/get-account-balances.js';
import type { ListAccounts } from '../../application/list-accounts.js';
import type { RunIdempotent } from '../../application/run-idempotent.js';
import type { SyncBankAccount } from '../../application/sync-bank-account.js';
import type { UpdateAccount } from '../../application/update-account.js';
import type { Account } from '../../domain/account.js';
import { hashIdempotencyPayload, parseIdempotencyKey } from './idempotency.js';

export type AccountRoutesDeps = {
  listAccounts: ListAccounts;
  getAccount: GetAccount;
  createAccount: CreateAccount;
  updateAccount: UpdateAccount;
  archiveAccount: ArchiveAccount;
  deleteAccount: DeleteAccount;
  getAccountBalances: GetAccountBalances;
  syncBankAccount: SyncBankAccount;
  disconnectBankAccount: DisconnectBankAccount;
  runIdempotent: RunIdempotent;
};

export async function registerAccountRoutes(app: FastifyInstance, deps: AccountRoutesDeps) {
  app.get('/accounts', { onRequest: [app.authenticate] }, async (request) => {
    const query = listAccountsQuerySchema.parse(request.query);
    const accounts = await deps.listAccounts.execute(request.user.sub, query);
    const balances = await deps.getAccountBalances.execute(request.user.sub);
    return presentAccounts(accounts, balances);
  });

  app.get('/accounts/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const account = await deps.getAccount.execute(request.user.sub, id);
    const balances = await deps.getAccountBalances.execute(request.user.sub);
    return presentAccount(account, balances);
  });

  app.post('/accounts', { onRequest: [app.authenticate] }, async (request, reply) => {
    const key = parseIdempotencyKey(request.headers);
    const body = createAccountBodySchema.parse(request.body);
    const result = await deps.runIdempotent.execute({
      userId: request.user.sub,
      key,
      method: 'POST',
      path: '/accounts',
      requestHash: hashIdempotencyPayload(body),
      run: async () => {
        const account = await deps.createAccount.execute(request.user.sub, body);
        return { status: 201, body: presentAccount(account, new Map()) };
      },
    });
    return reply.code(result.status).send(result.body);
  });

  app.patch('/accounts/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateAccountBodySchema.parse(request.body);
    const account = await deps.updateAccount.execute(request.user.sub, id, body);
    const balances = await deps.getAccountBalances.execute(request.user.sub);
    return presentAccount(account, balances);
  });

  app.post('/accounts/:id/archive', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = archiveAccountBodySchema.parse(request.body);
    const account = await deps.archiveAccount.execute(request.user.sub, id, body.archived);
    const balances = await deps.getAccountBalances.execute(request.user.sub);
    return presentAccount(account, balances);
  });

  app.delete('/accounts/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deps.deleteAccount.execute(request.user.sub, id);
    return reply.code(204).send();
  });

  app.post('/accounts/:id/sync', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const result = await deps.syncBankAccount.execute(request.user.sub, id);
    return syncBankAccountResponseSchema.parse(result);
  });

  app.post('/accounts/:id/disconnect', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const account = await deps.disconnectBankAccount.execute(request.user.sub, id);
    const balances = await deps.getAccountBalances.execute(request.user.sub);
    return presentAccount(account, balances);
  });
}

export function presentAccount(account: Account, balances: Map<string, number>): AccountDto {
  return accountSchema.parse(toAccountDto(account, balances.get(account.id) ?? 0));
}

export function presentAccounts(accounts: Account[], balances: Map<string, number>) {
  return accountsResponseSchema.parse({
    accounts: accounts.map((account) => toAccountDto(account, balances.get(account.id) ?? 0)),
  });
}

function toAccountDto(account: Account, balanceCents: number): AccountDto {
  const base = {
    id: account.id,
    userId: account.userId,
    name: account.name,
    currency: 'EUR' as const,
    color: account.color,
    excludeFromStats: account.excludeFromStats,
    archivedAt: account.archivedAt?.toISOString() ?? null,
    position: account.position,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    minBalanceCents: account.minBalanceCents,
    maxBalanceCents: account.maxBalanceCents,
    balanceCents,
  };

  if (account.kind === 'cash') {
    return { ...base, kind: 'cash' };
  }

  return {
    ...base,
    kind: 'bank',
    iban: account.iban,
    institutionName: account.institutionName,
    lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
  };
}
