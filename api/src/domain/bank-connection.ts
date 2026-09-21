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

export interface BankConnection {
  startConsent(input: { userId: string; redirectUri: string; state: string }): Promise<BankConsent>;
  listAccounts(providerConnectionId: string): Promise<ExternalBankAccount[]>;
  listTransactions(
    providerConnectionId: string,
    accountExternalId: string,
  ): Promise<ExternalBankTransaction[]>;
  revoke(providerConnectionId: string): Promise<void>;
}
