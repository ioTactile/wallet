import type {
  BankConsent,
  BankConnection,
  ExternalBankAccount,
  ExternalBankTransaction,
} from '../domain/bank-connection.js';
import type { BankProvider } from '../domain/bank-link.js';
import {
  gocardlessDateFrom,
  mapGoCardlessAccount,
  mapGoCardlessTransactions,
  type GoCardlessAccountDetails,
  type GoCardlessTransactionsPayload,
} from './gocardless-mapper.js';

export const GOCARDLESS_API_BASE = 'https://bankaccountdata.gocardless.com';
export const BOURSORAMA_INSTITUTION_ID = 'BOURSORAMA_BOUSFRPPXXX';
export const BOURSORAMA_INSTITUTION_NAME = 'BoursoBank';

const AIS_SCOPES = ['balances', 'details', 'transactions'] as const;
const ACCOUNT_PROCESSING_ATTEMPTS = 5;

export type GoCardlessBankConnectionConfig = {
  publicApiUrl: string;
  secretId: string;
  secretKey: string;
  institutionId?: string;
  institutionName?: string;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
};

type TokenResponse = {
  access?: string;
  access_expires?: number;
  refresh?: string;
};

type AgreementResponse = { id: string };

type RequisitionResponse = {
  id: string;
  link: string;
  accounts?: string[];
};

type AccountDetailsResponse = { account?: GoCardlessAccountDetails };

type TransactionsResponse = { transactions?: GoCardlessTransactionsPayload };

export class GoCardlessBankConnection implements BankConnection {
  readonly provider: BankProvider = 'gocardless';
  private readonly publicApiUrl: string;
  private readonly secretId: string;
  private readonly secretKey: string;
  private readonly institutionId: string;
  private readonly institutionName: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private access: { token: string; expiresAt: number } | null = null;

  constructor(config: GoCardlessBankConnectionConfig) {
    this.publicApiUrl = config.publicApiUrl;
    this.secretId = config.secretId;
    this.secretKey = config.secretKey;
    this.institutionId = config.institutionId ?? BOURSORAMA_INSTITUTION_ID;
    this.institutionName = config.institutionName ?? BOURSORAMA_INSTITUTION_NAME;
    this.fetchImpl = config.fetch ?? fetch;
    this.sleep = config.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async startConsent(input: {
    userId: string;
    redirectUri: string;
    state: string;
  }): Promise<BankConsent> {
    void input.userId;
    const agreement = await this.request<AgreementResponse>('/api/v2/agreements/enduser/', {
      method: 'POST',
      body: {
        institution_id: this.institutionId,
        max_historical_days: 90,
        access_valid_for_days: 90,
        access_scope: [...AIS_SCOPES],
      },
    });
    const redirect = new URL('/bank/gocardless/return', this.publicApiUrl);
    redirect.searchParams.set('connectionId', input.state);
    redirect.searchParams.set('redirect_uri', input.redirectUri);
    const requisition = await this.request<RequisitionResponse>('/api/v2/requisitions/', {
      method: 'POST',
      body: {
        redirect: redirect.toString(),
        institution_id: this.institutionId,
        reference: input.state,
        agreement: agreement.id,
        user_language: 'FR',
      },
    });
    return {
      providerConnectionId: requisition.id,
      authorizationUrl: requisition.link,
    };
  }

  async listAccounts(providerConnectionId: string): Promise<ExternalBankAccount[]> {
    const requisition = await this.request<RequisitionResponse>(
      `/api/v2/requisitions/${providerConnectionId}/`,
    );
    const accounts: ExternalBankAccount[] = [];
    for (const accountId of requisition.accounts ?? []) {
      const details = await this.getAccountDetails(accountId);
      const mapped = mapGoCardlessAccount(accountId, details, this.institutionName);
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
    const path = new URL(
      `/api/v2/accounts/${accountExternalId}/transactions/`,
      GOCARDLESS_API_BASE,
    );
    if (options?.from) {
      path.searchParams.set('date_from', gocardlessDateFrom(options.from));
    }
    const payload = await this.request<TransactionsResponse>(`${path.pathname}${path.search}`);
    return mapGoCardlessTransactions(accountExternalId, payload.transactions ?? {});
  }

  async finalizeConsent(input: { code?: string; providerConnectionId: string }): Promise<string> {
    void input.code;
    return input.providerConnectionId;
  }

  async revoke(providerConnectionId: string): Promise<void> {
    await this.request(`/api/v2/requisitions/${providerConnectionId}/`, { method: 'DELETE' });
  }

  private async getAccountDetails(accountId: string): Promise<GoCardlessAccountDetails> {
    for (let attempt = 0; attempt < ACCOUNT_PROCESSING_ATTEMPTS; attempt += 1) {
      const response = await this.authorizedFetch(`/api/v2/accounts/${accountId}/details/`);
      if (response.status === 409 && attempt < ACCOUNT_PROCESSING_ATTEMPTS - 1) {
        await this.sleep(200);
        continue;
      }
      await this.assertOk(response, `/api/v2/accounts/${accountId}/details/`);
      const payload = (await response.json()) as AccountDetailsResponse;
      return payload.account ?? {};
    }
    return {};
  }

  private async request<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<T> {
    const response = await this.authorizedFetch(path, init);
    await this.assertOk(response, path);
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (text.length === 0) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }

  private async authorizedFetch(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<Response> {
    const token = await this.accessToken();
    return this.fetchImpl(new URL(path, GOCARDLESS_API_BASE), {
      method: init.method ?? 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  }

  private async accessToken(): Promise<string> {
    if (this.access && this.access.expiresAt > Date.now()) {
      return this.access.token;
    }
    const response = await this.fetchImpl(new URL('/api/v2/token/new/', GOCARDLESS_API_BASE), {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ secret_id: this.secretId, secret_key: this.secretKey }),
    });
    await this.assertOk(response, '/api/v2/token/new/');
    const payload = (await response.json()) as TokenResponse;
    const token = payload.access;
    if (!token) {
      throw new Error('GoCardless token/new did not return an access token');
    }
    const ttlMs = (payload.access_expires ?? 86400) * 1000;
    this.access = { token, expiresAt: Date.now() + ttlMs - 60_000 };
    return token;
  }

  private async assertOk(response: Response, path: string): Promise<void> {
    if (response.ok) {
      return;
    }
    throw new Error(`GoCardless ${path} failed: ${response.status}`);
  }
}
