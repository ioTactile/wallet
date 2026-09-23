import type { Account, AspspRef, BankConnectionOptions } from '@wallet/shared';

import {
  BankApiError,
  type BankApi,
  type BankAuthSession,
  type StartBankConnectionResult,
  type SyncBankAccountResult,
} from '@/domain/ports';

export class StartBankConnection {
  constructor(private readonly bank: BankApi) {}

  execute(redirectUri: string, aspsp?: AspspRef): Promise<StartBankConnectionResult> {
    return this.bank.start(redirectUri, aspsp);
  }
}

export class CompleteBankConnection {
  constructor(private readonly bank: BankApi) {}

  execute(connectionId: string): Promise<Account[]> {
    return this.bank.complete(connectionId);
  }
}

export class GetBankConnectionOptions {
  constructor(private readonly bank: BankApi) {}

  execute(): Promise<BankConnectionOptions> {
    return this.bank.connectionOptions();
  }
}

export class ConnectBank {
  constructor(
    private readonly bank: BankApi,
    private readonly session: BankAuthSession,
  ) {}

  async execute(aspsp?: AspspRef): Promise<Account[]> {
    const redirectUri = this.session.redirectUri();
    const started = await this.bank.start(redirectUri, aspsp);
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
