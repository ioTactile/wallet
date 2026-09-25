import type { Account, CreateAccountBody, UpdateAccountBody } from '@wallet/shared';

import type { ListAccountsOptions } from '@/domain/list-options';
import type { AccountRepository, Clock, IdGenerator, WriteQueue } from '@/domain/ports';

import { shouldKeepQueuedWrite } from './write-queue';

export class ListAccounts {
  constructor(private readonly accounts: AccountRepository) {}

  execute(options?: ListAccountsOptions): Promise<Account[]> {
    return this.accounts.list(options);
  }
}

export class GetAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(id: string): Promise<Account> {
    return this.accounts.getById(id);
  }
}

export class CreateCashAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly queue: WriteQueue,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    input: Omit<Extract<CreateAccountBody, { kind: 'cash' }>, 'kind'>,
  ): Promise<Account> {
    const body: CreateAccountBody = { ...input, kind: 'cash' };
    const idempotencyKey = this.ids.generate();
    const pendingId = this.ids.generate();
    await this.queue.enqueue({
      id: pendingId,
      kind: 'create_account',
      body,
      idempotencyKey,
      enqueuedAt: this.clock.nowIso(),
    });
    try {
      const created = await this.accounts.create(body, idempotencyKey);
      await this.queue.remove(pendingId);
      return created;
    } catch (error) {
      if (!shouldKeepQueuedWrite(error)) {
        await this.queue.remove(pendingId);
      }
      throw error;
    }
  }
}

export class UpdateAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(id: string, body: UpdateAccountBody): Promise<Account> {
    return this.accounts.update(id, body);
  }
}

export class ArchiveAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(id: string, archived: boolean): Promise<Account> {
    return this.accounts.archive(id, archived);
  }
}

export class DeleteAccount {
  constructor(private readonly accounts: AccountRepository) {}

  execute(id: string): Promise<void> {
    return this.accounts.delete(id);
  }
}
