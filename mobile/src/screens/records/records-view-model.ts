import {
  categoriesFor,
  getCategory,
  signedAmountForSelection,
  type Account,
  type Record as WalletRecord,
  type RecordKind,
  type RecordsResponse,
  type UpdateRecordBody,
} from '@wallet/shared';

import { formatMoney, parseEurosToCents } from '@/domain/money';

export type RecordPeriod = 'today' | 'week' | 'month' | 'year';

export type RecordRowVm = {
  id: string;
  title: string;
  subtitle: string;
  note: string | null;
  amountLabel: string;
  amountCents: number;
  color: string;
  uncleared: boolean;
  bookedAt: string;
};

export type RecordWeekSectionVm = {
  key: string;
  week: number;
  openingCents: number;
  netCents: number;
  openingLabel: string;
  netLabel: string;
  rows: RecordRowVm[];
};

export function periodRange(period: RecordPeriod, now: Date): { from: string; to: string } {
  if (period === 'today') {
    return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() };
  }
  if (period === 'week') {
    const start = startOfIsoWeek(now);
    const end = endOfDay(addDays(start, 6));
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (period === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    return { from: start.toISOString(), to: end.toISOString() };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  const end = endOfDay(new Date(now.getFullYear(), 11, 31));
  return { from: start.toISOString(), to: end.toISOString() };
}

export function isoWeekNumber(date: Date): number {
  const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

export function toRecordRow(
  record: WalletRecord,
  accounts: readonly Account[],
  accountIds: string[] | undefined,
  categoryTitle: (id: string) => string,
): RecordRowVm {
  const amountCents = signedAmountForSelection(record, accountIds);
  const accountName = accountLabel(record, accounts, accountIds);
  const title = record.kind === 'transfer' ? accountName : categoryTitle(record.categoryId);
  const subtitle = record.kind === 'transfer' ? accountName : accountName;
  return {
    id: record.id,
    title,
    subtitle,
    note: record.note.length > 0 ? record.note : null,
    amountLabel: formatSigned(amountCents),
    amountCents,
    color: recordColor(record),
    uncleared: record.clearing === 'uncleared',
    bookedAt: record.bookedAt,
  };
}

export function groupRecordsByWeek(
  payload: RecordsResponse,
  accounts: readonly Account[],
  accountIds: string[] | undefined,
  categoryTitle: (id: string) => string,
): RecordWeekSectionVm[] {
  const sorted = [...payload.records].sort(
    (left, right) => right.bookedAt.localeCompare(left.bookedAt) || right.id.localeCompare(left.id),
  );
  const groups = new Map<string, WalletRecord[]>();
  for (const record of sorted) {
    const booked = new Date(record.bookedAt);
    const key = `${booked.getFullYear()}-${isoWeekNumber(booked)}`;
    const existing = groups.get(key) ?? [];
    existing.push(record);
    groups.set(key, existing);
  }

  const sections: RecordWeekSectionVm[] = [];
  let running = payload.openingBalanceCents;
  const chronological = [...groups.entries()].reverse();
  for (const [key, records] of chronological) {
    const netCents = records.reduce(
      (sum, record) => sum + signedAmountForSelection(record, accountIds),
      0,
    );
    const week = Number(key.split('-')[1]);
    sections.push({
      key,
      week,
      openingCents: running,
      netCents,
      openingLabel: formatMoney(running),
      netLabel: formatSigned(netCents),
      rows: records.map((record) => toRecordRow(record, accounts, accountIds, categoryTitle)),
    });
    running += netCents;
  }
  return sections.reverse();
}

export function appendCalculatorKey(buffer: string, key: string): string {
  if (key === 'backspace') {
    return buffer.slice(0, -1);
  }
  if (key === ',') {
    if (buffer.includes(',') || buffer.includes('.')) {
      return buffer;
    }
    return buffer.length === 0 ? '0,' : `${buffer},`;
  }
  if (!/^\d$/.test(key)) {
    return buffer;
  }
  const [, fraction = ''] = buffer.split(/[.,]/);
  if (buffer.includes(',') || buffer.includes('.')) {
    if (fraction.length >= 2) {
      return buffer;
    }
  }
  return `${buffer}${key}`;
}

export function calculatorCents(buffer: string): number {
  if (buffer.trim() === '') {
    return 0;
  }
  return parseEurosToCents(buffer) ?? 0;
}

export function calculatorDisplay(buffer: string): string {
  return formatMoney(calculatorCents(buffer));
}

export function canSubmitCalculator(buffer: string): boolean {
  return calculatorCents(buffer) > 0;
}

export function defaultCategoryId(kind: RecordKind): string | null {
  return categoriesFor(kind)[0]?.id ?? null;
}

export type RecordEditDraft = {
  kind: RecordKind;
  categoryId: string | null;
  otherAccountId: string | null;
  note: string;
  uncleared: boolean;
};

export function toRecordEditDraft(record: WalletRecord): RecordEditDraft {
  if (record.kind === 'transfer') {
    return {
      kind: 'transfer',
      categoryId: null,
      otherAccountId: record.toAccountId,
      note: record.note,
      uncleared: record.clearing === 'uncleared',
    };
  }
  return {
    kind: record.kind,
    categoryId: record.categoryId,
    otherAccountId: null,
    note: record.note,
    uncleared: record.clearing === 'uncleared',
  };
}

export function applyRecordEditParams(
  draft: RecordEditDraft,
  params: {
    kind?: string;
    categoryId?: string;
    toAccountId?: string;
    fromAccountId?: string;
  },
): RecordEditDraft {
  let next = draft;
  if (params.kind === 'expense' || params.kind === 'income' || params.kind === 'transfer') {
    next = draftForKind(next, params.kind);
  }
  if (params.categoryId != null && params.categoryId.length > 0) {
    next = { ...next, categoryId: params.categoryId };
  }
  const otherAccountId =
    (params.toAccountId != null && params.toAccountId.length > 0 && params.toAccountId) ||
    (params.fromAccountId != null && params.fromAccountId.length > 0 && params.fromAccountId) ||
    null;
  if (otherAccountId) {
    next = { ...next, otherAccountId, kind: 'transfer' };
  }
  return next;
}

export function draftForKind(draft: RecordEditDraft, kind: RecordKind): RecordEditDraft {
  if (kind === draft.kind) {
    return draft;
  }
  if (kind === 'transfer') {
    return { ...draft, kind, categoryId: null };
  }
  const keepCategory =
    draft.categoryId != null && getCategory(draft.categoryId)?.kind === kind
      ? draft.categoryId
      : defaultCategoryId(kind);
  return { ...draft, kind, categoryId: keepCategory };
}

export function destinationAccounts(
  accounts: readonly Account[],
  sourceAccountId: string,
): Account[] {
  return accounts.filter((account) => account.id !== sourceAccountId && account.archivedAt == null);
}

export function recordSourceAccountId(record: WalletRecord): string {
  return record.kind === 'transfer' ? record.fromAccountId : record.accountId;
}

export function canSubmitRecordEdit(record: WalletRecord, draft: RecordEditDraft): boolean {
  if (draft.kind === 'transfer') {
    const sourceId =
      record.kind === 'income' ? draft.otherAccountId : recordSourceAccountId(record);
    const destId = record.kind === 'income' ? record.accountId : draft.otherAccountId;
    return sourceId != null && destId != null && sourceId !== destId;
  }
  return draft.categoryId != null && draft.categoryId.length > 0;
}

export function recordUpdateBody(
  record: WalletRecord,
  draft: RecordEditDraft,
): UpdateRecordBody | null {
  if (!canSubmitRecordEdit(record, draft)) {
    return null;
  }
  const body: UpdateRecordBody = {};
  const note = draft.note.trim();
  if (note !== record.note) {
    body.note = note;
  }
  const clearing = draft.uncleared ? 'uncleared' : 'cleared';
  if (clearing !== record.clearing) {
    body.clearing = clearing;
  }

  if (draft.kind !== record.kind) {
    if (draft.kind === 'transfer') {
      body.kind = 'transfer';
      if (record.kind === 'income') {
        body.fromAccountId = draft.otherAccountId ?? undefined;
      } else {
        body.toAccountId = draft.otherAccountId ?? undefined;
      }
    } else {
      body.kind = draft.kind;
      if (draft.categoryId != null) {
        body.categoryId = draft.categoryId;
      }
    }
  } else if (record.kind === 'transfer' && draft.otherAccountId !== record.toAccountId) {
    if (draft.otherAccountId != null) {
      body.toAccountId = draft.otherAccountId;
    }
  } else if (
    record.kind !== 'transfer' &&
    draft.categoryId != null &&
    draft.categoryId !== record.categoryId
  ) {
    body.categoryId = draft.categoryId;
  }

  return Object.keys(body).length === 0 ? null : body;
}

export function cashAccounts(accounts: readonly Account[]): Account[] {
  return accounts.filter((account) => account.kind === 'cash' && account.archivedAt == null);
}

function recordColor(record: WalletRecord): string {
  if (record.kind === 'transfer') {
    return '#FFCA28';
  }
  return getCategory(record.categoryId)?.color ?? '#757575';
}

function accountLabel(
  record: WalletRecord,
  accounts: readonly Account[],
  accountIds: string[] | undefined,
): string {
  const names = new Map(accounts.map((account) => [account.id, account.name]));
  if (record.kind !== 'transfer') {
    return names.get(record.accountId) ?? '';
  }
  const selected = accountIds?.[0];
  if (selected === record.toAccountId) {
    return names.get(record.fromAccountId) ?? '';
  }
  return names.get(record.toAccountId) ?? '';
}

function formatSigned(cents: number): string {
  if (cents > 0) {
    return `+${formatMoney(cents)}`;
  }
  return formatMoney(cents);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfIsoWeek(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return start;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
