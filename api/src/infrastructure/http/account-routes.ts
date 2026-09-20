import {
  accountSchema,
  accountsResponseSchema,
  archiveAccountBodySchema,
  createAccountBodySchema,
  listAccountsQuerySchema,
  updateAccountBodySchema,
  type Account as AccountDto,
} from '@wallet/shared';
import type { FastifyInstance } from 'fastify';

import type { ArchiveAccount } from '../../application/archive-account.js';
import type { CreateAccount } from '../../application/create-account.js';
import type { DeleteAccount } from '../../application/delete-account.js';
import type { GetAccount } from '../../application/get-account.js';
import type { ListAccounts } from '../../application/list-accounts.js';
import type { UpdateAccount } from '../../application/update-account.js';
import type { Account } from '../../domain/account.js';

export type AccountRoutesDeps = {
  listAccounts: ListAccounts;
  getAccount: GetAccount;
  createAccount: CreateAccount;
  updateAccount: UpdateAccount;
  archiveAccount: ArchiveAccount;
  deleteAccount: DeleteAccount;
};

export async function registerAccountRoutes(app: FastifyInstance, deps: AccountRoutesDeps) {
  app.get('/accounts', { onRequest: [app.authenticate] }, async (request) => {
    const query = listAccountsQuerySchema.parse(request.query);
    const accounts = await deps.listAccounts.execute(request.user.sub, query);
    return presentAccounts(accounts);
  });

  app.get('/accounts/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const account = await deps.getAccount.execute(request.user.sub, id);
    return presentAccount(account);
  });

  app.post('/accounts', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = createAccountBodySchema.parse(request.body);
    const account = await deps.createAccount.execute(request.user.sub, body);
    return reply.code(201).send(presentAccount(account));
  });

  app.patch('/accounts/:id', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = updateAccountBodySchema.parse(request.body);
    const account = await deps.updateAccount.execute(request.user.sub, id, body);
    return presentAccount(account);
  });

  app.post('/accounts/:id/archive', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = archiveAccountBodySchema.parse(request.body);
    const account = await deps.archiveAccount.execute(request.user.sub, id, body.archived);
    return presentAccount(account);
  });

  app.delete('/accounts/:id', { onRequest: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deps.deleteAccount.execute(request.user.sub, id);
    return reply.code(204).send();
  });
}

function presentAccount(account: Account): AccountDto {
  return accountSchema.parse(toAccountDto(account));
}

function presentAccounts(accounts: Account[]) {
  return accountsResponseSchema.parse({ accounts: accounts.map(toAccountDto) });
}

function toAccountDto(account: Account): AccountDto {
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
    balanceCents: 0,
  };

  if (account.kind === 'cash') {
    return { ...base, kind: 'cash' };
  }

  return {
    ...base,
    kind: 'bank',
    iban: account.iban,
    institutionName: account.institutionName,
  };
}
