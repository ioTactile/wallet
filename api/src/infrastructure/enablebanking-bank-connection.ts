import type {
  BankConsent,
  BankConnection,
  ExternalBankAccount,
  ExternalBankTransaction,
} from '../domain/bank-connection.js';
import type { BankProvider } from '../domain/bank-link.js';
import { signEnableBankingJwt } from './enablebanking-jwt.js';
import {
  enableBankingDateFrom,
  encodeEnableBankingState,
  mapEnableBankingAccount,
  mapEnableBankingTransactions,
  type EnableBankingAccount,
  type EnableBankingTransaction,
} from './enablebanking-mapper.js';

export const ENABLEBANKING_API_BASE = 'https://api.enablebanking.com';
/** Exact ASPSP name from Enable Banking `/aspsps` (not the consumer brand). */
export const ENABLEBANKING_ASPSP_NAME = 'Boursorama Banque';
export const ENABLEBANKING_ASPSP_COUNTRY = 'FR';
/** Local account label shown in the PFM UI. */
export const ENABLEBANKING_INSTITUTION_NAME = 'BoursoBank';

const CONSENT_DAYS = 90;

export type EnableBankingBankConnectionConfig = {
  publicApiUrl: string;
  applicationId: string;
  privateKeyPem: string;
  aspspName?: string;
  aspspCountry?: string;
  institutionName?: string;
  fetch?: typeof fetch;
  signJwt?: () => string;
  now?: () => Date;
};

type AuthResponse = { url: string; authorization_id: string };
type SessionResponse = { session_id: string; accounts?: EnableBankingAccount[] };
type GetSessionResponse = { accounts?: string[]; aspsp?: { name?: string } };
type TransactionsResponse = {
  transactions?: EnableBankingTransaction[];
  continuation_key?: string | null;
};

export class EnableBankingBankConnection implements BankConnection {
  readonly provider: BankProvider = 'enablebanking';
  private readonly publicApiUrl: string;
  private readonly applicationId: string;
  private readonly privateKeyPem: string;
  private readonly aspspName: string;
  private readonly aspspCountry: string;
  private readonly institutionName: string;
  private readonly fetchImpl: typeof fetch;
  private readonly signJwt: () => string;
  private readonly now: () => Date;

  constructor(config: EnableBankingBankConnectionConfig) {
    this.publicApiUrl = config.publicApiUrl;
    this.applicationId = config.applicationId;
    this.privateKeyPem = config.privateKeyPem;
    this.aspspName = config.aspspName ?? ENABLEBANKING_ASPSP_NAME;
    this.aspspCountry = config.aspspCountry ?? ENABLEBANKING_ASPSP_COUNTRY;
    this.institutionName = config.institutionName ?? ENABLEBANKING_INSTITUTION_NAME;
    this.fetchImpl = config.fetch ?? fetch;
    this.now = config.now ?? (() => new Date());
    this.signJwt =
      config.signJwt ??
      (() =>
        signEnableBankingJwt({
          applicationId: this.applicationId,
          privateKeyPem: this.privateKeyPem,
          now: this.now(),
        }));
  }

  async startConsent(input: {
    userId: string;
    redirectUri: string;
    state: string;
  }): Promise<BankConsent> {
    void input.userId;
    const validUntil = new Date(this.now().getTime() + CONSENT_DAYS * 24 * 60 * 60 * 1000);
    const redirect = new URL('/bank/enablebanking/return', this.publicApiUrl);
    const started = await this.request<AuthResponse>('/auth', {
      method: 'POST',
      body: {
        access: { valid_until: validUntil.toISOString() },
        aspsp: { name: this.aspspName, country: this.aspspCountry },
        state: encodeEnableBankingState({
          connectionId: input.state,
          redirectUri: input.redirectUri,
        }),
        redirect_url: redirect.toString(),
        psu_type: 'personal',
        language: 'fr',
      },
    });
    return {
      providerConnectionId: started.authorization_id,
      authorizationUrl: started.url,
    };
  }

  async finalizeConsent(input: { code?: string; providerConnectionId: string }): Promise<string> {
    if (input.code == null || input.code.trim().length === 0) {
      throw new Error('Enable Banking authorization code is required');
    }
    const session = await this.request<SessionResponse>('/sessions', {
      method: 'POST',
      body: { code: input.code },
    });
    return session.session_id;
  }

  async listAccounts(providerConnectionId: string): Promise<ExternalBankAccount[]> {
    const session = await this.request<GetSessionResponse>(`/sessions/${providerConnectionId}`);
    const institutionName = session.aspsp?.name?.trim() || this.institutionName;
    const accounts: ExternalBankAccount[] = [];
    for (const accountId of session.accounts ?? []) {
      const details = await this.request<EnableBankingAccount>(`/accounts/${accountId}/details`);
      const mapped = mapEnableBankingAccount(
        { ...details, uid: details.uid ?? accountId },
        institutionName,
      );
      if (mapped) {
        accounts.push(mapped);
      }
    }
    return accounts;
  }

  async listTransactions(
    _providerConnectionId: string,
    accountExternalId: string,
    options?: { from?: Date },
  ): Promise<ExternalBankTransaction[]> {
    const collected: EnableBankingTransaction[] = [];
    let continuationKey: string | null | undefined;
    do {
      const path = new URL(`/accounts/${accountExternalId}/transactions`, ENABLEBANKING_API_BASE);
      if (options?.from) {
        path.searchParams.set('date_from', enableBankingDateFrom(options.from));
      }
      if (continuationKey) {
        path.searchParams.set('continuation_key', continuationKey);
      }
      const page = await this.request<TransactionsResponse>(`${path.pathname}${path.search}`);
      collected.push(...(page.transactions ?? []));
      continuationKey = page.continuation_key || null;
    } while (continuationKey);
    return mapEnableBankingTransactions(accountExternalId, collected);
  }

  async revoke(providerConnectionId: string): Promise<void> {
    await this.request(`/sessions/${providerConnectionId}`, { method: 'DELETE' });
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const response = await this.fetchImpl(new URL(path, ENABLEBANKING_API_BASE), {
      method: init.method ?? 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${this.signJwt()}`,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (!response.ok) {
      const detail = (await response.text()).trim();
      throw new Error(
        detail.length > 0
          ? `Enable Banking ${path} failed: ${response.status} ${detail}`
          : `Enable Banking ${path} failed: ${response.status}`,
      );
    }
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (text.length === 0) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }
}
