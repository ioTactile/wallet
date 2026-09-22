import {
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_ACCOUNT_CURRENCY,
  type Account,
  type CreateAccountBody,
  type CreateRecordBody,
  type Record as WalletRecord,
  type RecordsResponse,
  type UpdateAccountBody,
  type UpdateRecordBody,
} from '@wallet/shared';

import type {
  AccountRepository,
  AuthApi,
  ListAccountsOptions,
  ListRecordsOptions,
  PinHasher,
  PinVault,
  RecordRepository,
  SessionVault,
} from '@/domain/ports';
import { AccountApiError, AuthApiError, RecordApiError } from '@/domain/ports';
import type { PinRecord, Session } from '@/domain/session';

export const FAKE_NOW = '2026-09-20T10:00:00.000Z';
export const FAKE_USER_ID = '7c1e9b4a-2d3f-4a5b-8c9d-0e1f2a3b4c5d';

function nextUuid(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

export function makeCashAccount(
  overrides: Partial<Extract<Account, { kind: 'cash' }>> = {},
): Extract<Account, { kind: 'cash' }> {
  return {
    id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
    userId: FAKE_USER_ID,
    kind: 'cash',
    name: 'Espèces',
    currency: DEFAULT_ACCOUNT_CURRENCY,
    color: DEFAULT_ACCOUNT_COLOR,
    excludeFromStats: false,
    archivedAt: null,
    position: 0,
    createdAt: FAKE_NOW,
    updatedAt: FAKE_NOW,
    minBalanceCents: null,
    maxBalanceCents: null,
    balanceCents: 0,
    ...overrides,
  };
}

export function makeBankAccount(
  overrides: Partial<Extract<Account, { kind: 'bank' }>> = {},
): Extract<Account, { kind: 'bank' }> {
  return {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    userId: FAKE_USER_ID,
    kind: 'bank',
    name: 'BoursoBank',
    currency: DEFAULT_ACCOUNT_CURRENCY,
    color: DEFAULT_ACCOUNT_COLOR,
    excludeFromStats: false,
    archivedAt: null,
    position: 1,
    createdAt: FAKE_NOW,
    updatedAt: FAKE_NOW,
    minBalanceCents: null,
    maxBalanceCents: null,
    balanceCents: 0,
    iban: 'FR7630001007941234567890185',
    institutionName: 'BoursoBank',
    lastSyncedAt: null,
    ...overrides,
  };
}

export class InMemoryAccountRepository implements AccountRepository {
  accounts: Account[] = [];
  private seq = 0;

  async list(options?: ListAccountsOptions): Promise<Account[]> {
    const items = options?.includeArchived
      ? this.accounts
      : this.accounts.filter((account) => account.archivedAt === null);
    return [...items].sort((left, right) => left.position - right.position);
  }

  async getById(id: string): Promise<Account> {
    const found = this.accounts.find((account) => account.id === id);
    if (!found) {
      throw new AccountApiError('account_not_found');
    }
    return found;
  }

  async create(body: CreateAccountBody): Promise<Account> {
    this.seq += 1;
    const base = {
      id: nextUuid(this.seq),
      userId: FAKE_USER_ID,
      name: body.name,
      currency: body.currency,
      color: body.color,
      excludeFromStats: body.excludeFromStats,
      archivedAt: null,
      position: this.accounts.length,
      createdAt: FAKE_NOW,
      updatedAt: FAKE_NOW,
      minBalanceCents: body.minBalanceCents ?? null,
      maxBalanceCents: body.maxBalanceCents ?? null,
      balanceCents: 0,
    };
    const account: Account =
      body.kind === 'bank'
        ? {
            ...base,
            kind: 'bank',
            iban: body.iban ?? null,
            institutionName: body.institutionName ?? null,
            lastSyncedAt: null,
          }
        : { ...base, kind: 'cash' };
    this.accounts.push(account);
    return account;
  }

  async update(id: string, body: UpdateAccountBody): Promise<Account> {
    const current = await this.getById(id);
    if (
      current.kind === 'cash' &&
      (body.iban !== undefined || body.institutionName !== undefined)
    ) {
      throw new AccountApiError('invalid_account');
    }
    const next: Account =
      current.kind === 'bank'
        ? {
            ...current,
            name: body.name ?? current.name,
            color: body.color ?? current.color,
            excludeFromStats: body.excludeFromStats ?? current.excludeFromStats,
            minBalanceCents:
              body.minBalanceCents === undefined ? current.minBalanceCents : body.minBalanceCents,
            maxBalanceCents:
              body.maxBalanceCents === undefined ? current.maxBalanceCents : body.maxBalanceCents,
            iban: body.iban === undefined ? current.iban : body.iban,
            institutionName:
              body.institutionName === undefined ? current.institutionName : body.institutionName,
            updatedAt: FAKE_NOW,
          }
        : {
            ...current,
            name: body.name ?? current.name,
            color: body.color ?? current.color,
            excludeFromStats: body.excludeFromStats ?? current.excludeFromStats,
            minBalanceCents:
              body.minBalanceCents === undefined ? current.minBalanceCents : body.minBalanceCents,
            maxBalanceCents:
              body.maxBalanceCents === undefined ? current.maxBalanceCents : body.maxBalanceCents,
            updatedAt: FAKE_NOW,
          };
    this.accounts = this.accounts.map((account) => (account.id === id ? next : account));
    return next;
  }

  async archive(id: string, archived: boolean): Promise<Account> {
    const current = await this.getById(id);
    const next: Account = {
      ...current,
      archivedAt: archived ? FAKE_NOW : null,
      updatedAt: FAKE_NOW,
    };
    this.accounts = this.accounts.map((account) => (account.id === id ? next : account));
    return next;
  }

  async delete(id: string): Promise<void> {
    const target = await this.getById(id);
    if (target.kind === 'cash' && target.archivedAt === null) {
      const activeCash = this.accounts.filter(
        (account) => account.kind === 'cash' && account.archivedAt === null,
      );
      if (activeCash.length <= 1) {
        throw new AccountApiError('cannot_delete_last_cash_account');
      }
    }
    this.accounts = this.accounts.filter((account) => account.id !== id);
  }
}

export function makeExpenseRecord(
  overrides: Partial<Extract<WalletRecord, { kind: 'expense' }>> = {},
): Extract<WalletRecord, { kind: 'expense' }> {
  return {
    id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
    userId: FAKE_USER_ID,
    kind: 'expense',
    accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    categoryId: 'food_drinks.groceries',
    amountCents: 199,
    currency: DEFAULT_ACCOUNT_CURRENCY,
    bookedAt: FAKE_NOW,
    clearing: 'cleared',
    categoryConfirmed: false,
    note: 'Courses',
    createdAt: FAKE_NOW,
    updatedAt: FAKE_NOW,
    ...overrides,
  };
}

export function makeTransferRecord(
  overrides: Partial<Extract<WalletRecord, { kind: 'transfer' }>> = {},
): Extract<WalletRecord, { kind: 'transfer' }> {
  return {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    userId: FAKE_USER_ID,
    kind: 'transfer',
    fromAccountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    toAccountId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    amountCents: 500,
    currency: DEFAULT_ACCOUNT_CURRENCY,
    bookedAt: FAKE_NOW,
    clearing: 'cleared',
    categoryConfirmed: false,
    note: '',
    createdAt: FAKE_NOW,
    updatedAt: FAKE_NOW,
    ...overrides,
  };
}

export class InMemoryRecordRepository implements RecordRepository {
  records: WalletRecord[] = [];
  private seq = 10;

  async list(options: ListRecordsOptions): Promise<RecordsResponse> {
    const inPeriod = this.records.filter(
      (record) => record.bookedAt >= options.from && record.bookedAt <= options.to,
    );
    return {
      records: inPeriod,
      openingBalanceCents: 0,
      periodNetCents: inPeriod.reduce(
        (sum, record) =>
          sum + (record.kind === 'expense' ? -record.amountCents : record.amountCents),
        0,
      ),
    };
  }

  async getById(id: string): Promise<WalletRecord> {
    const found = this.records.find((record) => record.id === id);
    if (!found) {
      throw new RecordApiError('record_not_found');
    }
    return found;
  }

  async create(body: CreateRecordBody): Promise<WalletRecord> {
    this.seq += 1;
    const base = {
      id: nextUuid(this.seq),
      userId: FAKE_USER_ID,
      amountCents: body.amountCents,
      currency: DEFAULT_ACCOUNT_CURRENCY,
      bookedAt: body.bookedAt ?? FAKE_NOW,
      clearing: body.clearing ?? 'cleared',
      note: body.note ?? '',
      categoryConfirmed: false,
      createdAt: FAKE_NOW,
      updatedAt: FAKE_NOW,
    };
    const record: WalletRecord =
      body.kind === 'transfer'
        ? {
            ...base,
            kind: 'transfer',
            fromAccountId: body.fromAccountId,
            toAccountId: body.toAccountId,
          }
        : {
            ...base,
            kind: body.kind,
            accountId: body.accountId,
            categoryId: body.categoryId,
          };
    this.records.push(record);
    return record;
  }

  async update(id: string, body: UpdateRecordBody): Promise<WalletRecord> {
    const current = await this.getById(id);
    const base = {
      id: current.id,
      userId: current.userId,
      amountCents: body.amountCents ?? current.amountCents,
      currency: current.currency,
      bookedAt: body.bookedAt ?? current.bookedAt,
      clearing: body.clearing ?? current.clearing,
      note: body.note ?? current.note,
      categoryConfirmed:
        body.categoryConfirmed ??
        (body.categoryId != null || (body.kind != null && body.kind !== current.kind)
          ? false
          : current.categoryConfirmed),
      createdAt: current.createdAt,
      updatedAt: FAKE_NOW,
    };
    let next: WalletRecord = current;
    if (body.kind === 'transfer' && current.kind !== 'transfer') {
      next = {
        ...base,
        kind: 'transfer',
        fromAccountId:
          current.kind === 'income' ? (body.fromAccountId ?? current.accountId) : current.accountId,
        toAccountId:
          current.kind === 'income' ? current.accountId : (body.toAccountId ?? current.accountId),
      };
    } else if ((body.kind === 'expense' || body.kind === 'income') && current.kind !== body.kind) {
      const accountId =
        current.kind === 'transfer'
          ? body.kind === 'income'
            ? current.toAccountId
            : current.fromAccountId
          : current.accountId;
      next = {
        ...base,
        kind: body.kind,
        accountId,
        categoryId: body.categoryId ?? 'food_drinks',
      };
    } else if (current.kind === 'transfer') {
      next = {
        ...current,
        ...base,
        kind: 'transfer',
        fromAccountId: body.fromAccountId ?? current.fromAccountId,
        toAccountId: body.toAccountId ?? current.toAccountId,
      };
    } else {
      next = {
        ...current,
        ...base,
        kind: current.kind,
        accountId: body.accountId ?? current.accountId,
        categoryId: body.categoryId ?? current.categoryId,
      };
    }
    this.records = this.records.map((record) => (record.id === id ? next : record));
    return next;
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    this.records = this.records.filter((record) => record.id !== id);
  }
}

export class InMemoryPinVault implements PinVault {
  record: PinRecord | null = null;

  async get() {
    return this.record;
  }

  async save(record: PinRecord) {
    this.record = record;
  }
}

export class InMemorySessionVault implements SessionVault {
  session: Session | null = null;

  async get() {
    return this.session;
  }

  async save(session: Session) {
    this.session = session;
  }

  async clear() {
    this.session = null;
  }
}

export class FakePinHasher implements PinHasher {
  async generateSalt() {
    return 'salt';
  }

  async hash(pin: string, salt: string) {
    return `${salt}:${pin}`;
  }
}

export class FakeAuthApi implements AuthApi {
  users = new Map<string, { password: string; id: string; firstName: string; lastName: string }>();

  async register(email: string, password: string): Promise<Session> {
    if (this.users.has(email)) {
      throw new AuthApiError('email_already_taken');
    }
    this.users.set(email, { password, id: 'user-1', firstName: '', lastName: '' });
    return this.session(email);
  }

  async login(email: string, password: string): Promise<Session> {
    const user = this.users.get(email);
    if (!user || user.password !== password) {
      throw new AuthApiError('invalid_credentials');
    }
    return this.session(email);
  }

  async refresh(): Promise<Session> {
    throw new AuthApiError('invalid_refresh_token');
  }

  async logout(): Promise<void> {}

  async me(accessToken: string): Promise<Session['user']> {
    void accessToken;
    return { id: 'user-1', email: 'jordan@example.com', firstName: '', lastName: '' };
  }

  async updateProfile(
    accessToken: string,
    profile: { firstName: string; lastName: string },
  ): Promise<Session['user']> {
    void accessToken;
    const entry = [...this.users.values()][0];
    if (!entry) {
      throw new AuthApiError('unauthorized');
    }
    entry.firstName = profile.firstName;
    entry.lastName = profile.lastName;
    return {
      id: entry.id,
      email: [...this.users.keys()][0]!,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
  }

  private session(email: string): Session {
    const user = this.users.get(email)!;
    return {
      user: {
        id: user.id,
        email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    };
  }
}
