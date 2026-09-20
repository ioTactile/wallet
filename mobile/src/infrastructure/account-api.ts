import {
  accountSchema,
  accountsResponseSchema,
  archiveAccountBodySchema,
  type Account,
  type CreateAccountBody,
  type UpdateAccountBody,
} from '@wallet/shared';

import {
  AccountApiError,
  AuthApiError,
  type AccountRepository,
  type AuthApi,
  type ListAccountsOptions,
  type SessionVault,
} from '@/domain/ports';

function baseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined');
  }
  return url.replace(/\/$/, '');
}

async function parseError(response: Response): Promise<AccountApiError> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return new AccountApiError(body.error ?? 'generic_error');
}

export class HttpAccountApi implements AccountRepository {
  private refreshInFlight: Promise<void> | null = null;

  constructor(
    private readonly sessions: SessionVault,
    private readonly auth: Pick<AuthApi, 'refresh'>,
  ) {}

  async list(options?: ListAccountsOptions): Promise<Account[]> {
    const query = options?.includeArchived ? '?includeArchived=true' : '';
    const payload = accountsResponseSchema.parse(
      await this.requestJson(`/accounts${query}`, { method: 'GET' }),
    );
    return payload.accounts;
  }

  async getById(id: string): Promise<Account> {
    return accountSchema.parse(await this.requestJson(`/accounts/${id}`, { method: 'GET' }));
  }

  async create(body: CreateAccountBody): Promise<Account> {
    return accountSchema.parse(
      await this.requestJson('/accounts', { method: 'POST', body: JSON.stringify(body) }),
    );
  }

  async update(id: string, body: UpdateAccountBody): Promise<Account> {
    return accountSchema.parse(
      await this.requestJson(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    );
  }

  async archive(id: string, archived: boolean): Promise<Account> {
    return accountSchema.parse(
      await this.requestJson(`/accounts/${id}/archive`, {
        method: 'POST',
        body: JSON.stringify(archiveAccountBodySchema.parse({ archived })),
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.requestJson(`/accounts/${id}`, { method: 'DELETE' }, { allowEmpty: true });
  }

  private async headers(): Promise<HeadersInit> {
    const session = await this.sessions.get();
    if (!session) {
      throw new AccountApiError('unauthorized');
    }
    return {
      'Content-Type': 'application/json',
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
      throw new AccountApiError('unauthorized');
    }
    try {
      await this.sessions.save(await this.auth.refresh(session.refreshToken));
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw new AccountApiError(error.code);
      }
      throw error;
    }
  }

  private async requestJson(
    path: string,
    init: RequestInit,
    options?: { allowEmpty?: boolean; retried?: boolean },
  ): Promise<unknown> {
    const response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: {
        ...(await this.headers()),
        ...init.headers,
      },
    });
    if (response.status === 401 && !options?.retried) {
      await this.refreshSession();
      return this.requestJson(path, init, { ...options, retried: true });
    }
    if (!response.ok) {
      throw await parseError(response);
    }
    if (options?.allowEmpty || response.status === 204) {
      return null;
    }
    return response.json();
  }
}
