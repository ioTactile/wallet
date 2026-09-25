import {
  accountsResponseSchema,
  accountSchema,
  bankConnectionOptionsSchema,
  startBankConnectionBodySchema,
  startBankConnectionResponseSchema,
  syncBankAccountResponseSchema,
  type Account,
  type AspspRef,
  type BankConnectionOptions,
} from '@wallet/shared';

import { AuthApiError, BankApiError } from '@/domain/errors';
import type { StartBankConnectionResult, SyncBankAccountResult } from '@/domain/bank';
import type { AuthApi, BankApi, SessionVault } from '@/domain/ports';

function baseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined');
  }
  return url.replace(/\/$/, '');
}

async function parseError(response: Response): Promise<BankApiError> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return new BankApiError(body.error ?? 'generic_error');
}

export class HttpBankApi implements BankApi {
  private refreshInFlight: Promise<void> | null = null;

  constructor(
    private readonly sessions: SessionVault,
    private readonly auth: Pick<AuthApi, 'refresh'>,
  ) {}

  async connectionOptions(): Promise<BankConnectionOptions> {
    return bankConnectionOptionsSchema.parse(
      await this.requestJson('/bank/connection-options', { method: 'GET' }),
    );
  }

  async start(redirectUri: string, aspsp?: AspspRef): Promise<StartBankConnectionResult> {
    return startBankConnectionResponseSchema.parse(
      await this.requestJson('/bank/connections', {
        method: 'POST',
        body: JSON.stringify(
          startBankConnectionBodySchema.parse({
            redirectUri,
            ...(aspsp ? { aspsp } : {}),
          }),
        ),
      }),
    );
  }

  async complete(connectionId: string): Promise<Account[]> {
    const payload = accountsResponseSchema.parse(
      await this.requestJson(`/bank/connections/${connectionId}/complete`, { method: 'POST' }),
    );
    return payload.accounts;
  }

  async sync(accountId: string): Promise<SyncBankAccountResult> {
    return syncBankAccountResponseSchema.parse(
      await this.requestJson(`/accounts/${accountId}/sync`, { method: 'POST' }),
    );
  }

  async disconnect(accountId: string): Promise<Account> {
    return accountSchema.parse(
      await this.requestJson(`/accounts/${accountId}/disconnect`, { method: 'POST' }),
    );
  }

  private async headers(hasBody: boolean): Promise<HeadersInit> {
    const session = await this.sessions.get();
    if (!session) {
      throw new BankApiError('unauthorized');
    }
    return {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${session.accessToken}`,
    };
  }

  private async refreshSession(): Promise<void> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.rotateRefresh().finally(() => {
        this.refreshInFlight = null;
      });
    }
    await this.refreshInFlight;
  }

  private async rotateRefresh(): Promise<void> {
    const session = await this.sessions.get();
    if (!session) {
      throw new BankApiError('unauthorized');
    }
    try {
      await this.sessions.save(await this.auth.refresh(session.refreshToken));
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw new BankApiError(error.code);
      }
      throw error;
    }
  }

  private async requestJson(
    path: string,
    init: RequestInit,
    options?: { retried?: boolean },
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${baseUrl()}${path}`, {
        ...init,
        headers: {
          ...(await this.headers(init.body != null)),
          ...init.headers,
        },
      });
    } catch {
      throw new BankApiError('network_error');
    }
    if (response.status === 401 && !options?.retried) {
      await this.refreshSession();
      return this.requestJson(path, init, { retried: true });
    }
    if (!response.ok) {
      throw await parseError(response);
    }
    return response.json();
  }
}
