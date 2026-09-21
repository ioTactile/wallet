import type { Account } from '@wallet/shared';

import {
  BankApiError,
  type BankApi,
  type BankAuthSession,
  type StartBankConnectionResult,
  type SyncBankAccountResult,
} from '@/domain/ports';

export class StartBankConnection {
  constructor(private readonly bank: BankApi) {}

  execute(redirectUri: string): Promise<StartBankConnectionResult> {
    return this.bank.start(redirectUri);
  }
}

export class CompleteBankConnection {
  constructor(private readonly bank: BankApi) {}

  execute(connectionId: string): Promise<Account[]> {
    return this.bank.complete(connectionId);
  }
}

export class ConnectDemoBank {
  constructor(
    private readonly bank: BankApi,
    private readonly session: BankAuthSession,
  ) {}

  async execute(): Promise<Account[]> {
    const redirectUri = this.session.redirectUri();
    const started = await this.bank.start(redirectUri);
    const result = await this.session.open(started.authorizationUrl, redirectUri);
    if (result !== 'success') {
      throw new BankApiError('cancelled');
    }
    return this.bank.complete(started.id);
  }
}

export class SyncBankAccount {
  constructor(private readonly bank: BankApi) {}

  execute(accountId: string): Promise<SyncBankAccountResult> {
    return this.bank.sync(accountId);
  }
}

export class DisconnectBankAccount {
  constructor(private readonly bank: BankApi) {}

  execute(accountId: string): Promise<Account> {
    return this.bank.disconnect(accountId);
  }
}
