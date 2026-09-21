import { createHash } from 'node:crypto';

import type { ExternalBankAccount, ExternalBankTransaction } from '../domain/bank-connection.js';

const EURO_AMOUNT = /^-?(\d+)(?:[.,](\d{0,2}))?$/;

export type GoCardlessAmount = {
  currency?: string;
  amount?: string;
};

export type GoCardlessTransaction = {
  transactionId?: string;
  internalTransactionId?: string;
  transactionAmount?: GoCardlessAmount;
  bookingDate?: string;
  valueDate?: string;
  remittanceInformationUnstructured?: string;
  remittanceInformationUnstructuredArray?: string[];
  debtorName?: string;
  creditorName?: string;
};

export type GoCardlessTransactionsPayload = {
  booked?: GoCardlessTransaction[];
  pending?: GoCardlessTransaction[];
};

export type GoCardlessAccountDetails = {
  resourceId?: string;
  iban?: string;
  currency?: string;
  name?: string;
  displayName?: string;
  product?: string;
  ownerName?: string;
};

export function parseEuroAmountToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (trimmed === '') {
    return null;
  }
  const match = EURO_AMOUNT.exec(trimmed);
  if (!match) {
    return null;
  }
  const whole = Number.parseInt(match[1] ?? '0', 10);
  const fraction = (match[2] ?? '').padEnd(2, '0');
  const cents = whole * 100 + Number.parseInt(fraction || '0', 10);
  return trimmed.startsWith('-') ? -cents : cents;
}

export function mapGoCardlessAccount(
  externalId: string,
  details: GoCardlessAccountDetails,
  institutionName: string,
): ExternalBankAccount | null {
  const currency = details.currency?.trim().toUpperCase() || 'EUR';
  if (currency !== 'EUR') {
    return null;
  }
  const name =
    firstText(details.name, details.displayName, details.product, institutionName) ??
    institutionName;
  return {
    externalId,
    name,
    iban: details.iban?.trim() || null,
    institutionName,
    currency,
  };
}

export function mapGoCardlessTransactions(
  accountExternalId: string,
  payload: GoCardlessTransactionsPayload,
): ExternalBankTransaction[] {
  return [
    ...(payload.booked ?? []).flatMap((transaction) =>
      mapTransaction(accountExternalId, transaction, false),
    ),
    ...(payload.pending ?? []).flatMap((transaction) =>
      mapTransaction(accountExternalId, transaction, true),
    ),
  ];
}

function mapTransaction(
  accountExternalId: string,
  transaction: GoCardlessTransaction,
  pending: boolean,
): ExternalBankTransaction[] {
  const currency = transaction.transactionAmount?.currency?.trim().toUpperCase() || 'EUR';
  if (currency !== 'EUR') {
    return [];
  }
  const amountRaw = transaction.transactionAmount?.amount;
  if (amountRaw == null) {
    return [];
  }
  const signedAmountCents = parseEuroAmountToCents(amountRaw);
  if (signedAmountCents == null || signedAmountCents === 0) {
    return [];
  }
  const bookedAt = parseBookingDate(transaction.bookingDate ?? transaction.valueDate);
  if (bookedAt == null) {
    return [];
  }
  const label = transactionLabel(transaction);
  const externalId =
    firstText(transaction.transactionId, transaction.internalTransactionId) ??
    stablePendingId(accountExternalId, bookedAt, signedAmountCents, label);
  return [
    {
      externalId,
      accountExternalId,
      signedAmountCents,
      bookedAt,
      label,
      pending,
    },
  ];
}

export function gocardlessDateFrom(from: Date, overlapDays = 2): string {
  const overlapped = new Date(from.getTime() - overlapDays * 24 * 60 * 60 * 1000);
  return overlapped.toISOString().slice(0, 10);
}

function parseBookingDate(value: string | undefined): Date | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  return new Date(`${trimmed}T00:00:00.000Z`);
}

function transactionLabel(transaction: GoCardlessTransaction): string {
  return (
    firstText(
      transaction.remittanceInformationUnstructured,
      transaction.remittanceInformationUnstructuredArray?.join(' '),
      transaction.creditorName,
      transaction.debtorName,
    ) ?? 'BoursoBank'
  );
}

function stablePendingId(
  accountExternalId: string,
  bookedAt: Date,
  signedAmountCents: number,
  label: string,
): string {
  return createHash('sha256')
    .update(`${accountExternalId}\0${bookedAt.toISOString()}\0${signedAmountCents}\0${label}`)
    .digest('hex')
    .slice(0, 32);
}

function firstText(...values: Array<string | undefined | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return null;
}
