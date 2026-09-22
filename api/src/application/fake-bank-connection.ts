import type {
  BankConsent,
  BankConnection,
  ExternalBankAccount,
  ExternalBankTransaction,
  ListBankTransactionsOptions,
} from '../domain/bank-connection.js';
import type { BankProvider } from '../domain/bank-link.js';

export const SANDBOX_CHECKING_EXTERNAL_ID = 'sandbox-checking';

export const SANDBOX_ACCOUNTS: readonly ExternalBankAccount[] = [
  {
    externalId: SANDBOX_CHECKING_EXTERNAL_ID,
    name: 'Compte courant',
    iban: 'FR7630001007941234567890185',
    institutionName: 'Banque démo',
    currency: 'EUR',
  },
];

export const SANDBOX_TRANSACTIONS: readonly ExternalBankTransaction[] = [
  {
    externalId: 'sandbox-tx-salary',
    accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
    signedAmountCents: 2500_00,
    bookedAt: new Date('2026-09-03T08:00:00.000Z'),
    label: 'Salaire',
    pending: false,
  },
  {
    externalId: 'sandbox-tx-carrefour',
    accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
    signedAmountCents: -54_90,
    bookedAt: new Date('2026-09-05T10:15:00.000Z'),
    label: 'Carrefour',
    pending: false,
  },
  {
    externalId: 'sandbox-tx-edf',
    accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
    signedAmountCents: -87_20,
    bookedAt: new Date('2026-09-07T06:00:00.000Z'),
    label: 'EDF',
    pending: false,
  },
  {
    externalId: 'sandbox-tx-spotify',
    accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
    signedAmountCents: -10_99,
    bookedAt: new Date('2026-09-10T07:00:00.000Z'),
    label: 'Spotify',
    pending: false,
  },
  {
    externalId: 'sandbox-tx-refund',
    accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
    signedAmountCents: 32_00,
    bookedAt: new Date('2026-09-12T14:30:00.000Z'),
    label: 'Remboursement',
    pending: false,
  },
  {
    externalId: 'sandbox-tx-restaurant',
    accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
    signedAmountCents: -38_50,
    bookedAt: new Date('2026-09-15T19:40:00.000Z'),
    label: 'Restaurant',
    pending: false,
  },
  {
    externalId: 'sandbox-tx-rent',
    accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
    signedAmountCents: -850_00,
    bookedAt: new Date('2026-09-18T09:00:00.000Z'),
    label: 'Loyer',
    pending: false,
  },
  {
    externalId: 'sandbox-tx-coffee',
    accountExternalId: SANDBOX_CHECKING_EXTERNAL_ID,
    signedAmountCents: -4_50,
    bookedAt: new Date('2026-09-20T08:20:00.000Z'),
    label: 'Café',
    pending: true,
  },
];

export class FakeBankConnection implements BankConnection {
  readonly provider: BankProvider = 'sandbox';
  extraTransactions: ExternalBankTransaction[] = [];
  lastFrom: Date | undefined;
  private readonly revoked = new Set<string>();

  constructor(private readonly publicApiUrl: string) {}

  async startConsent(input: {
    userId: string;
    redirectUri: string;
    state: string;
  }): Promise<BankConsent> {
    if (input.userId.trim().length === 0) {
      throw new Error('Sandbox consent requires a wallet user id');
    }
    void input.redirectUri;
    const providerConnectionId = `sandbox:${input.state}`;
    const url = new URL('/bank/sandbox/authorize', this.publicApiUrl);
    url.searchParams.set('connectionId', input.state);
    return { providerConnectionId, authorizationUrl: url.toString() };
  }

  async ensureConsentForLink(): Promise<void> {
    // Sandbox accounts are fixed fixtures; ownership is enforced by BankLink.userId.
  }

  async listAccounts(providerConnectionId: string): Promise<ExternalBankAccount[]> {
    this.assertActive(providerConnectionId);
    return [...SANDBOX_ACCOUNTS];
  }

  async listTransactions(
    providerConnectionId: string,
    accountExternalId: string,
    options?: ListBankTransactionsOptions,
  ): Promise<ExternalBankTransaction[]> {
    this.assertActive(providerConnectionId);
    this.lastFrom = options?.from;
    return [
      ...SANDBOX_TRANSACTIONS.filter(
        (transaction) => transaction.accountExternalId === accountExternalId,
      ),
      ...this.extraTransactions.filter(
        (transaction) => transaction.accountExternalId === accountExternalId,
      ),
    ];
  }

  async finalizeConsent(input: { code?: string; providerConnectionId: string }): Promise<string> {
    void input.code;
    return input.providerConnectionId;
  }

  async revoke(providerConnectionId: string): Promise<void> {
    this.revoked.add(providerConnectionId);
  }

  private assertActive(providerConnectionId: string): void {
    if (this.revoked.has(providerConnectionId)) {
      throw new Error('Bank connection revoked');
    }
  }
}
