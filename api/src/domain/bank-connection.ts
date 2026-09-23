import type { BankProvider } from './bank-link.js';

export type ExternalBankAccount = {
  externalId: string;
  name: string;
  iban: string | null;
  institutionName: string;
  currency: string;
};

export type ExternalBankTransaction = {
  externalId: string;
  accountExternalId: string;
  signedAmountCents: number;
  bookedAt: Date;
  label: string;
  pending: boolean;
};

export type BankConsent = {
  providerConnectionId: string;
  authorizationUrl: string;
};

export type ListBankTransactionsOptions = {
  from?: Date;
};

export type FinalizeBankConsentInput = {
  code?: string;
  providerConnectionId: string;
};

export type AspspRef = {
  name: string;
  country: string;
};

export type StartBankConsentInput = {
  userId: string;
  redirectUri: string;
  state: string;
  aspsp?: AspspRef;
};

export interface BankConnection {
  readonly provider: BankProvider;
  startConsent(input: StartBankConsentInput): Promise<BankConsent>;
  finalizeConsent(input: FinalizeBankConsentInput): Promise<string>;
  ensureConsentForLink(input: {
    providerConnectionId: string;
    linkId: string;
    userId: string;
  }): Promise<void>;
  listAccounts(providerConnectionId: string): Promise<ExternalBankAccount[]>;
  listTransactions(
    providerConnectionId: string,
    accountExternalId: string,
    options?: ListBankTransactionsOptions,
  ): Promise<ExternalBankTransaction[]>;
  revoke(providerConnectionId: string): Promise<void>;
}
