import {
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_ACCOUNT_CURRENCY,
  DEFAULT_CASH_ACCOUNT_ID,
  HEX_COLOR_PATTERN,
  type AccountKind,
} from '@wallet/shared';

import { AccountKindMismatch, InvalidAccount } from './errors.js';

export type AccountProps = {
  id: string;
  userId: string;
  kind: AccountKind;
  name: string;
  currency: string;
  color: string;
  excludeFromStats: boolean;
  archivedAt: Date | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  minBalanceCents: number | null;
  maxBalanceCents: number | null;
  iban?: string | null;
  institutionName?: string | null;
};

type CreateAccountInput = {
  id: string;
  userId: string;
  name: string;
  now: Date;
  color?: string;
  currency?: string;
  excludeFromStats?: boolean;
  minBalanceCents?: number | null;
  maxBalanceCents?: number | null;
  position?: number;
};

export class Account {
  readonly id: string;
  readonly userId: string;
  readonly kind: AccountKind;
  readonly name: string;
  readonly currency: string;
  readonly color: string;
  readonly excludeFromStats: boolean;
  readonly archivedAt: Date | null;
  readonly position: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly minBalanceCents: number | null;
  readonly maxBalanceCents: number | null;
  readonly iban: string | null;
  readonly institutionName: string | null;

  constructor(props: AccountProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.kind = props.kind;
    this.name = normalizeName(props.name);
    this.currency = normalizeCurrency(props.currency);
    this.color = normalizeColor(props.color);
    this.excludeFromStats = props.excludeFromStats;
    this.archivedAt = props.archivedAt;
    this.position = normalizePosition(props.position);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.minBalanceCents = normalizeCents(props.minBalanceCents);
    this.maxBalanceCents = normalizeCents(props.maxBalanceCents);
    this.iban = normalizeOptionalText(props.iban, 34);
    this.institutionName = normalizeOptionalText(props.institutionName, 100);
    assertId(this.id);
    assertBalanceAlerts(this.minBalanceCents, this.maxBalanceCents);
    if (this.kind === 'cash' && (this.iban !== null || this.institutionName !== null)) {
      throw new AccountKindMismatch();
    }
  }

  static createCash(input: CreateAccountInput): Account {
    return new Account({
      ...createDefaults(input, 'cash'),
      iban: null,
      institutionName: null,
    });
  }

  static createBank(
    input: CreateAccountInput & { iban?: string | null; institutionName?: string | null },
  ): Account {
    return new Account({
      ...createDefaults(input, 'bank'),
      iban: input.iban ?? null,
      institutionName: input.institutionName ?? null,
    });
  }

  rename(name: string, now: Date): Account {
    return this.with({ name }, now);
  }

  recolor(color: string, now: Date): Account {
    return this.with({ color }, now);
  }

  setExcludeFromStats(excludeFromStats: boolean, now: Date): Account {
    return this.with({ excludeFromStats }, now);
  }

  setBalanceAlerts(
    minBalanceCents: number | null,
    maxBalanceCents: number | null,
    now: Date,
  ): Account {
    return this.with({ minBalanceCents, maxBalanceCents }, now);
  }

  setBankDetails(iban: string | null, institutionName: string | null, now: Date): Account {
    if (this.kind !== 'bank') {
      throw new AccountKindMismatch();
    }
    return this.with({ iban, institutionName }, now);
  }

  archive(now: Date): Account {
    if (this.archivedAt) {
      return this;
    }
    return this.with({ archivedAt: now }, now);
  }

  unarchive(now: Date): Account {
    if (!this.archivedAt) {
      return this;
    }
    return this.with({ archivedAt: null }, now);
  }

  private with(overrides: Partial<AccountProps>, now: Date): Account {
    return new Account({
      id: this.id,
      userId: this.userId,
      kind: this.kind,
      name: this.name,
      currency: this.currency,
      color: this.color,
      excludeFromStats: this.excludeFromStats,
      archivedAt: this.archivedAt,
      position: this.position,
      createdAt: this.createdAt,
      updatedAt: now,
      minBalanceCents: this.minBalanceCents,
      maxBalanceCents: this.maxBalanceCents,
      iban: this.iban,
      institutionName: this.institutionName,
      ...overrides,
    });
  }
}

function createDefaults(input: CreateAccountInput, kind: AccountKind): AccountProps {
  return {
    id: input.id,
    userId: input.userId,
    kind,
    name: input.name,
    currency: input.currency ?? DEFAULT_ACCOUNT_CURRENCY,
    color: input.color ?? DEFAULT_ACCOUNT_COLOR,
    excludeFromStats: input.excludeFromStats ?? false,
    archivedAt: null,
    position: input.position ?? 0,
    createdAt: input.now,
    updatedAt: input.now,
    minBalanceCents: input.minBalanceCents ?? null,
    maxBalanceCents: input.maxBalanceCents ?? null,
  };
}

function assertId(id: string): void {
  if (id.length === 0 || id === DEFAULT_CASH_ACCOUNT_ID) {
    throw new InvalidAccount('Invalid account id');
  }
}

function normalizeName(name: string): string {
  const value = name.trim();
  if (value.length === 0 || value.length > 100) {
    throw new InvalidAccount('Invalid account name');
  }
  return value;
}

function normalizeCurrency(currency: string): string {
  if (currency !== DEFAULT_ACCOUNT_CURRENCY) {
    throw new InvalidAccount('Invalid account currency');
  }
  return currency;
}

function normalizeColor(color: string): string {
  const value = color.trim().toUpperCase();
  if (!HEX_COLOR_PATTERN.test(value)) {
    throw new InvalidAccount('Invalid account color');
  }
  return value;
}

function normalizePosition(position: number): number {
  if (!Number.isInteger(position) || position < 0) {
    throw new InvalidAccount('Invalid account position');
  }
  return position;
}

function normalizeCents(value: number | null): number | null {
  if (value == null) {
    return null;
  }
  if (!Number.isInteger(value)) {
    throw new InvalidAccount('Invalid balance alert');
  }
  return value;
}

function normalizeOptionalText(value: string | null | undefined, max: number): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.length > max) {
    throw new InvalidAccount('Invalid account field');
  }
  return trimmed;
}

function assertBalanceAlerts(min: number | null, max: number | null): void {
  if (min != null && max != null && min >= max) {
    throw new InvalidAccount('minBalanceCents must be less than maxBalanceCents');
  }
}
