import { InvalidBankLink } from './errors.js';

export const BANK_PROVIDERS = ['sandbox', 'gocardless', 'enablebanking'] as const;
export type BankProvider = (typeof BANK_PROVIDERS)[number];

export const BANK_LINK_STATUSES = ['pending', 'active', 'revoked'] as const;
export type BankLinkStatus = (typeof BANK_LINK_STATUSES)[number];

export class BankLink {
  readonly id: string;
  readonly userId: string;
  readonly provider: BankProvider;
  readonly providerConnectionId: string;
  readonly status: BankLinkStatus;
  readonly lastSyncedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    userId: string;
    provider: BankProvider;
    providerConnectionId: string;
    status: BankLinkStatus;
    lastSyncedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = assertId(props.id);
    this.userId = assertId(props.userId);
    this.provider = assertProvider(props.provider);
    this.providerConnectionId = assertId(props.providerConnectionId);
    this.status = assertStatus(props.status);
    this.lastSyncedAt = props.lastSyncedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static start(input: {
    id: string;
    userId: string;
    provider: BankProvider;
    providerConnectionId: string;
    now: Date;
  }): BankLink {
    return new BankLink({
      id: input.id,
      userId: input.userId,
      provider: input.provider,
      providerConnectionId: input.providerConnectionId,
      status: 'pending',
      lastSyncedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    });
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  activate(now: Date): BankLink {
    if (this.status === 'revoked') {
      throw new InvalidBankLink('Revoked bank link cannot be activated');
    }
    if (this.status === 'active') {
      return this;
    }
    return this.with({ status: 'active' }, now);
  }

  markSynced(now: Date): BankLink {
    if (this.status !== 'active') {
      throw new InvalidBankLink('Only an active bank link can be synced');
    }
    return this.with({ lastSyncedAt: now }, now);
  }

  revoke(now: Date): BankLink {
    if (this.status === 'revoked') {
      return this;
    }
    return this.with({ status: 'revoked' }, now);
  }

  bindProviderConnection(providerConnectionId: string, now: Date): BankLink {
    if (this.status === 'revoked') {
      throw new InvalidBankLink('Revoked bank link cannot change provider connection');
    }
    if (this.providerConnectionId === providerConnectionId) {
      return this;
    }
    return this.with({ providerConnectionId: assertId(providerConnectionId) }, now);
  }

  private with(
    overrides: Partial<{
      status: BankLinkStatus;
      lastSyncedAt: Date | null;
      providerConnectionId: string;
    }>,
    now: Date,
  ): BankLink {
    return new BankLink({
      id: this.id,
      userId: this.userId,
      provider: this.provider,
      providerConnectionId: this.providerConnectionId,
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      createdAt: this.createdAt,
      updatedAt: now,
      ...overrides,
    });
  }
}

function assertId(value: string): string {
  if (value.trim().length === 0) {
    throw new InvalidBankLink('Invalid bank link id');
  }
  return value;
}

function assertProvider(value: BankProvider): BankProvider {
  if (!(BANK_PROVIDERS as readonly string[]).includes(value)) {
    throw new InvalidBankLink('Invalid bank provider');
  }
  return value;
}

function assertStatus(value: BankLinkStatus): BankLinkStatus {
  if (!(BANK_LINK_STATUSES as readonly string[]).includes(value)) {
    throw new InvalidBankLink('Invalid bank link status');
  }
  return value;
}
