import { describe, expect, it } from '@jest/globals';

import type { AspspRef, BankConnectionOptions } from '@wallet/shared';

import type { BankApi, BankAuthSession } from '@/domain/ports';

import {
  CompleteBankConnection,
  ConnectBank,
  DisconnectBankAccount,
  DismissBankAuth,
  GetBankConnectionOptions,
  NotifyBankAuthFromWindow,
  StartBankConnection,
  SyncBankAccount,
} from './bank';
import { makeBankAccount } from './fakes';

class InMemoryBankApi implements BankApi {
  started = false;
  lastAspsp: AspspRef | undefined;
  completed = false;
  synced: string[] = [];
  disconnected: string[] = [];
  failStart: Error | null = null;
  options: BankConnectionOptions = {
    provider: 'sandbox',
    selectUrl: null,
    country: 'FR',
  };

  async connectionOptions() {
    return this.options;
  }

  async start(redirectUri: string, aspsp?: AspspRef) {
    if (this.failStart) throw this.failStart;
    this.started = true;
    this.lastAspsp = aspsp;
    return {
      id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
      authorizationUrl: `http://api.test/bank/sandbox/authorize?redirect_uri=${encodeURIComponent(redirectUri)}`,
    };
  }

  async complete() {
    this.completed = true;
    return [makeBankAccount({ name: 'Compte courant', lastSyncedAt: '2026-09-20T10:00:00.000Z' })];
  }

  async sync(accountId: string) {
    this.synced.push(accountId);
    return { importedCount: 0 };
  }

  async disconnect(accountId: string) {
    this.disconnected.push(accountId);
    return makeBankAccount({ archivedAt: '2026-09-20T10:00:00.000Z' });
  }
}

class ImmediateAuthSession implements BankAuthSession {
  result: 'success' | 'cancel' = 'success';
  dismissed = false;
  notified = false;

  redirectUri() {
    return 'mobile://bank/callback';
  }

  async open() {
    return this.result;
  }

  dismissPending() {
    this.dismissed = true;
  }

  notifyFromCallbackWindow() {
    this.notified = true;
    return true;
  }
}

describe('bank use cases', () => {
  it('starts then completes after a successful auth session', async () => {
    const api = new InMemoryBankApi();
    const session = new ImmediateAuthSession();
    const accounts = await new ConnectBank(api, session).execute();
    expect(api.started).toBe(true);
    expect(api.completed).toBe(true);
    expect(accounts[0]?.kind).toBe('bank');
    expect(accounts[0]?.name).toBe('Compte courant');
  });

  it('forwards the selected ASPSP when connecting', async () => {
    const api = new InMemoryBankApi();
    await new ConnectBank(api, new ImmediateAuthSession()).execute({
      name: 'Crédit Agricole',
      country: 'FR',
    });
    expect(api.lastAspsp).toEqual({ name: 'Crédit Agricole', country: 'FR' });
  });

  it('loads connection options', async () => {
    const api = new InMemoryBankApi();
    api.options = {
      provider: 'enablebanking',
      selectUrl: 'http://api.test/bank/enablebanking/select',
      country: 'FR',
    };
    await expect(new GetBankConnectionOptions(api).execute()).resolves.toEqual(api.options);
  });

  it('does not complete when the user cancels the browser', async () => {
    const api = new InMemoryBankApi();
    const session = new ImmediateAuthSession();
    session.result = 'cancel';
    await expect(new ConnectBank(api, session).execute()).rejects.toMatchObject({
      code: 'cancelled',
    });
    expect(api.completed).toBe(false);
  });

  it('starts, completes, syncs and disconnects through dedicated use cases', async () => {
    const api = new InMemoryBankApi();
    const started = await new StartBankConnection(api).execute('mobile://bank/callback');
    expect(started.id).toBe('3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12');
    await new CompleteBankConnection(api).execute(started.id);
    await new SyncBankAccount(api).execute('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
    const disconnected = await new DisconnectBankAccount(api).execute(
      'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    );
    expect(api.synced).toEqual(['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee']);
    expect(disconnected.archivedAt).toBeTruthy();
  });

  it('dismisses and notifies through the auth session port', () => {
    const session = new ImmediateAuthSession();
    new DismissBankAuth(session).execute();
    expect(session.dismissed).toBe(true);
    expect(new NotifyBankAuthFromWindow(session).execute()).toBe(true);
    expect(session.notified).toBe(true);
  });
});
