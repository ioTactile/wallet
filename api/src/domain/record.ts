import {
  AIS_EXPENSE_CATEGORY_ID,
  AIS_INCOME_CATEGORY_ID,
  DEFAULT_ACCOUNT_CURRENCY,
  RECORD_CLEARING,
  RECORD_KINDS,
  RECORD_NOTE_MAX_LENGTH,
  getCategory,
  type RecordClearing,
  type RecordKind,
} from '@wallet/shared';

import { CannotMutateAisRecord, InvalidRecord } from './errors.js';

export type LedgerRecordProps = {
  id: string;
  userId: string;
  kind: RecordKind;
  accountId: string;
  counterpartyAccountId: string | null;
  categoryId: string | null;
  amountCents: number;
  currency: string;
  bookedAt: Date;
  clearing: RecordClearing;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  externalId?: string | null;
};

type CreateLedgerInput = {
  id: string;
  userId: string;
  accountId: string;
  amountCents: number;
  now: Date;
  bookedAt?: Date;
  clearing?: RecordClearing;
  note?: string;
  currency?: string;
};

export class LedgerRecord {
  readonly id: string;
  readonly userId: string;
  readonly kind: RecordKind;
  readonly accountId: string;
  readonly counterpartyAccountId: string | null;
  readonly categoryId: string | null;
  readonly amountCents: number;
  readonly currency: string;
  readonly bookedAt: Date;
  readonly clearing: RecordClearing;
  readonly note: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly externalId: string | null;

  constructor(props: LedgerRecordProps) {
    this.id = assertId(props.id);
    this.userId = assertId(props.userId);
    this.kind = assertKind(props.kind);
    this.accountId = assertId(props.accountId);
    this.counterpartyAccountId = props.counterpartyAccountId
      ? assertId(props.counterpartyAccountId)
      : null;
    this.categoryId = props.categoryId;
    this.amountCents = assertAmount(props.amountCents);
    this.currency = assertCurrency(props.currency);
    this.bookedAt = props.bookedAt;
    this.clearing = assertClearing(props.clearing);
    this.note = normalizeNote(props.note);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.externalId = normalizeExternalId(props.externalId);
    assertShape(this);
  }

  get isAis(): boolean {
    return this.externalId != null;
  }

  static createExpense(input: CreateLedgerInput & { categoryId: string }): LedgerRecord {
    return LedgerRecord.createLedger('expense', input);
  }

  static createIncome(input: CreateLedgerInput & { categoryId: string }): LedgerRecord {
    return LedgerRecord.createLedger('income', input);
  }

  static createTransfer(
    input: CreateLedgerInput & { counterpartyAccountId: string },
  ): LedgerRecord {
    return new LedgerRecord({
      id: input.id,
      userId: input.userId,
      kind: 'transfer',
      accountId: input.accountId,
      counterpartyAccountId: input.counterpartyAccountId,
      categoryId: null,
      amountCents: input.amountCents,
      currency: input.currency ?? DEFAULT_ACCOUNT_CURRENCY,
      bookedAt: input.bookedAt ?? input.now,
      clearing: input.clearing ?? 'cleared',
      note: input.note ?? '',
      createdAt: input.now,
      updatedAt: input.now,
      externalId: null,
    });
  }

  static createFromAis(
    input: Omit<CreateLedgerInput, 'amountCents'> & {
      externalId: string;
      signedAmountCents: number;
      label: string;
    },
  ): LedgerRecord {
    if (!Number.isInteger(input.signedAmountCents) || input.signedAmountCents === 0) {
      throw new InvalidRecord('Invalid AIS amount');
    }
    const kind: Exclude<RecordKind, 'transfer'> =
      input.signedAmountCents < 0 ? 'expense' : 'income';
    return new LedgerRecord({
      id: input.id,
      userId: input.userId,
      kind,
      accountId: input.accountId,
      counterpartyAccountId: null,
      categoryId: kind === 'expense' ? AIS_EXPENSE_CATEGORY_ID : AIS_INCOME_CATEGORY_ID,
      amountCents: Math.abs(input.signedAmountCents),
      currency: input.currency ?? DEFAULT_ACCOUNT_CURRENCY,
      bookedAt: input.bookedAt ?? input.now,
      clearing: input.clearing ?? 'cleared',
      note: input.label,
      createdAt: input.now,
      updatedAt: input.now,
      externalId: input.externalId,
    });
  }

  recategorize(categoryId: string, now: Date): LedgerRecord {
    if (this.kind === 'transfer') {
      throw new InvalidRecord('Transfers have no category');
    }
    return this.with({ categoryId }, now);
  }

  convertToTransfer(otherAccountId: string, now: Date): LedgerRecord {
    if (this.kind === 'transfer') {
      throw new InvalidRecord('Already a transfer');
    }
    if (otherAccountId === this.accountId) {
      throw new InvalidRecord('Transfer accounts must differ');
    }
    if (this.kind === 'income') {
      return this.with(
        {
          kind: 'transfer',
          accountId: otherAccountId,
          counterpartyAccountId: this.accountId,
          categoryId: null,
        },
        now,
      );
    }
    return this.with(
      {
        kind: 'transfer',
        counterpartyAccountId: otherAccountId,
        categoryId: null,
      },
      now,
    );
  }

  convertToLedger(
    kind: Exclude<RecordKind, 'transfer'>,
    categoryId: string,
    now: Date,
  ): LedgerRecord {
    const accountId =
      this.kind === 'transfer' && kind === 'income' && this.counterpartyAccountId != null
        ? this.counterpartyAccountId
        : this.accountId;
    return this.with(
      {
        kind,
        categoryId,
        accountId,
        counterpartyAccountId: null,
      },
      now,
    );
  }

  moveToAccount(accountId: string, now: Date): LedgerRecord {
    this.assertManualMutation();
    if (this.kind === 'transfer') {
      throw new InvalidRecord('Use setTransferAccounts for transfers');
    }
    return this.with({ accountId }, now);
  }

  setTransferAccounts(fromAccountId: string, toAccountId: string, now: Date): LedgerRecord {
    if (this.kind !== 'transfer') {
      throw new InvalidRecord('Only transfers have two accounts');
    }
    if (
      this.isAis &&
      fromAccountId !== this.accountId &&
      toAccountId !== this.counterpartyAccountId
    ) {
      throw new CannotMutateAisRecord();
    }
    return this.with({ accountId: fromAccountId, counterpartyAccountId: toAccountId }, now);
  }

  setAmount(amountCents: number, now: Date): LedgerRecord {
    this.assertManualMutation();
    return this.with({ amountCents }, now);
  }

  setBookedAt(bookedAt: Date, now: Date): LedgerRecord {
    this.assertManualMutation();
    return this.with({ bookedAt }, now);
  }

  setClearing(clearing: RecordClearing, now: Date): LedgerRecord {
    this.assertManualMutation();
    return this.with({ clearing }, now);
  }

  setNote(note: string, now: Date): LedgerRecord {
    return this.with({ note }, now);
  }

  applyAisSnapshot(
    snapshot: {
      signedAmountCents: number;
      bookedAt: Date;
      pending: boolean;
      label: string;
    },
    now: Date,
  ): LedgerRecord {
    if (!this.isAis) {
      throw new InvalidRecord('Only AIS records can apply a bank snapshot');
    }
    if (!Number.isInteger(snapshot.signedAmountCents) || snapshot.signedAmountCents === 0) {
      throw new InvalidRecord('Invalid AIS amount');
    }
    return this.with(
      {
        amountCents: Math.abs(snapshot.signedAmountCents),
        bookedAt: snapshot.bookedAt,
        clearing: snapshot.pending ? 'uncleared' : 'cleared',
        note: snapshot.label,
      },
      now,
    );
  }

  private static createLedger(
    kind: Exclude<RecordKind, 'transfer'>,
    input: CreateLedgerInput & { categoryId: string },
  ): LedgerRecord {
    return new LedgerRecord({
      id: input.id,
      userId: input.userId,
      kind,
      accountId: input.accountId,
      counterpartyAccountId: null,
      categoryId: input.categoryId,
      amountCents: input.amountCents,
      currency: input.currency ?? DEFAULT_ACCOUNT_CURRENCY,
      bookedAt: input.bookedAt ?? input.now,
      clearing: input.clearing ?? 'cleared',
      note: input.note ?? '',
      createdAt: input.now,
      updatedAt: input.now,
      externalId: null,
    });
  }

  private assertManualMutation(): void {
    if (this.isAis) {
      throw new CannotMutateAisRecord();
    }
  }

  private with(overrides: Partial<LedgerRecordProps>, now: Date): LedgerRecord {
    return new LedgerRecord({
      id: this.id,
      userId: this.userId,
      kind: this.kind,
      accountId: this.accountId,
      counterpartyAccountId: this.counterpartyAccountId,
      categoryId: this.categoryId,
      amountCents: this.amountCents,
      currency: this.currency,
      bookedAt: this.bookedAt,
      clearing: this.clearing,
      note: this.note,
      createdAt: this.createdAt,
      updatedAt: now,
      externalId: this.externalId,
      ...overrides,
    });
  }
}

function assertId(id: string): string {
  if (id.trim().length === 0) {
    throw new InvalidRecord('Invalid id');
  }
  return id;
}

function assertKind(kind: RecordKind): RecordKind {
  if (!(RECORD_KINDS as readonly string[]).includes(kind)) {
    throw new InvalidRecord('Invalid kind');
  }
  return kind;
}

function assertClearing(clearing: RecordClearing): RecordClearing {
  if (!(RECORD_CLEARING as readonly string[]).includes(clearing)) {
    throw new InvalidRecord('Invalid clearing');
  }
  return clearing;
}

function assertAmount(amountCents: number): number {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new InvalidRecord('Invalid amount');
  }
  return amountCents;
}

function assertCurrency(currency: string): string {
  if (currency !== DEFAULT_ACCOUNT_CURRENCY) {
    throw new InvalidRecord('Invalid currency');
  }
  return currency;
}

function normalizeNote(note: string): string {
  const value = note.trim();
  if (value.length > RECORD_NOTE_MAX_LENGTH) {
    throw new InvalidRecord('Invalid note');
  }
  return value;
}

function normalizeExternalId(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new InvalidRecord('Invalid external id');
  }
  return trimmed;
}

function assertShape(record: LedgerRecord): void {
  if (record.kind === 'transfer') {
    if (record.categoryId != null) {
      throw new InvalidRecord('Transfers have no category');
    }
    if (record.counterpartyAccountId == null) {
      throw new InvalidRecord('Transfers require a destination account');
    }
    if (record.accountId === record.counterpartyAccountId) {
      throw new InvalidRecord('Transfer accounts must differ');
    }
    return;
  }
  if (record.counterpartyAccountId != null) {
    throw new InvalidRecord('Expense and income have a single account');
  }
  if (record.categoryId == null || record.categoryId.length === 0) {
    throw new InvalidRecord('Category is required');
  }
  const category = getCategory(record.categoryId);
  if (!category || category.kind !== record.kind) {
    throw new InvalidRecord('Category does not match kind');
  }
}
