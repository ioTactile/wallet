import { createHash } from 'node:crypto';

import type { ExternalBankAccount, ExternalBankTransaction } from '../domain/bank-connection.js';
import { parseEuroAmountToCents } from './gocardless-mapper.js';

export type EnableBankingAccount = {
  uid?: string;
  name?: string;
  details?: string;
  product?: string;
  currency?: string;
  account_id?: { iban?: string };
};

export type EnableBankingTransaction = {
  transaction_id?: string;
  entry_reference?: string;
  transaction_amount?: { currency?: string; amount?: string };
  credit_debit_indicator?: string;
  status?: string;
  booking_date?: string;
  value_date?: string;
  transaction_date?: string;
  remittance_information?: string[];
  creditor?: { name?: string };
  debtor?: { name?: string };
  note?: string;
};

export function encodeEnableBankingState(input: {
  connectionId: string;
  redirectUri: string;
}): string {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

export function decodeEnableBankingState(state: string): {
  connectionId: string;
  redirectUri: string;
} {
  const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as {
    connectionId?: unknown;
    redirectUri?: unknown;
  };
  if (typeof parsed.connectionId !== 'string' || typeof parsed.redirectUri !== 'string') {
    throw new Error('Invalid Enable Banking state');
  }
  if (parsed.connectionId.trim().length === 0 || parsed.redirectUri.trim().length === 0) {
    throw new Error('Invalid Enable Banking state');
  }
  return { connectionId: parsed.connectionId, redirectUri: parsed.redirectUri };
}

export function enableBankingDateFrom(from: Date, overlapDays = 2): string {
  const overlapped = new Date(from.getTime() - overlapDays * 24 * 60 * 60 * 1000);
  return overlapped.toISOString().slice(0, 10);
}

export function mapEnableBankingAccount(
  account: EnableBankingAccount,
  institutionName: string,
): ExternalBankAccount | null {
  const externalId = account.uid?.trim();
  if (!externalId) {
    return null;
  }
  const currency = account.currency?.trim().toUpperCase() || 'EUR';
  if (currency !== 'EUR') {
    return null;
  }
  const name =
    firstText(account.details, account.name, account.product, institutionName) ?? institutionName;
  return {
    externalId,
    name,
    iban: account.account_id?.iban?.trim() || null,
    institutionName,
    currency,
  };
}

export function mapEnableBankingTransactions(
  accountExternalId: string,
  transactions: EnableBankingTransaction[],
): ExternalBankTransaction[] {
  return transactions.flatMap((transaction) => mapTransaction(accountExternalId, transaction));
}

function mapTransaction(
  accountExternalId: string,
  transaction: EnableBankingTransaction,
): ExternalBankTransaction[] {
  const currency = transaction.transaction_amount?.currency?.trim().toUpperCase() || 'EUR';
  if (currency !== 'EUR') {
    return [];
  }
  const amountRaw = transaction.transaction_amount?.amount;
  if (amountRaw == null) {
    return [];
  }
  let signedAmountCents = parseEuroAmountToCents(amountRaw);
  if (signedAmountCents == null || signedAmountCents === 0) {
    return [];
  }
  if (transaction.credit_debit_indicator?.toUpperCase() === 'DBIT' && signedAmountCents > 0) {
    signedAmountCents = -signedAmountCents;
  }
  const bookedAt = parseBookingDate(
    transaction.booking_date ?? transaction.value_date ?? transaction.transaction_date,
  );
  if (bookedAt == null) {
    return [];
  }
  const label =
    firstText(
      transaction.remittance_information?.join(' '),
      transaction.creditor?.name,
      transaction.debtor?.name,
      transaction.note,
    ) ?? 'BoursoBank';
  const externalId =
    firstText(transaction.transaction_id, transaction.entry_reference) ??
    stableId(accountExternalId, bookedAt, signedAmountCents, label);
  return [
    {
      externalId,
      accountExternalId,
      signedAmountCents,
      bookedAt,
      label,
      pending: transaction.status?.toUpperCase() === 'PDNG',
    },
  ];
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

function stableId(
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
