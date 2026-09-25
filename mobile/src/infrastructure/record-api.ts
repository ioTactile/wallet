import {
  IDEMPOTENCY_KEY_HEADER,
  createRecordBodySchema,
  listRecordsQuerySchema,
  recordSchema,
  recordsResponseSchema,
  updateRecordBodySchema,
  type CreateRecordBody,
  type Record as WalletRecord,
  type RecordsResponse,
  type UpdateRecordBody,
} from '@wallet/shared';

import { AuthApiError, RecordApiError } from '@/domain/errors';
import type { ListRecordsOptions } from '@/domain/list-options';
import type { AuthApi, RecordRepository, SessionVault } from '@/domain/ports';

function baseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined');
  }
  return url.replace(/\/$/, '');
}

async function parseError(response: Response): Promise<RecordApiError> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return new RecordApiError(body.error ?? 'generic_error');
}

export class HttpRecordApi implements RecordRepository {
  private refreshInFlight: Promise<void> | null = null;

  constructor(
    private readonly sessions: SessionVault,
    private readonly auth: Pick<AuthApi, 'refresh'>,
  ) {}

  async list(options: ListRecordsOptions): Promise<RecordsResponse> {
    const query = listRecordsQuerySchema.parse({
      from: options.from,
      to: options.to,
      accountIds: options.accountIds?.join(','),
    });
    const params = new URLSearchParams({ from: query.from, to: query.to });
    if (query.accountIds && query.accountIds.length > 0) {
      params.set('accountIds', query.accountIds.join(','));
    }
    return recordsResponseSchema.parse(
      await this.requestJson(`/records?${params.toString()}`, { method: 'GET' }),
    );
  }

  async getById(id: string): Promise<WalletRecord> {
    return recordSchema.parse(await this.requestJson(`/records/${id}`, { method: 'GET' }));
  }

  async create(body: CreateRecordBody, idempotencyKey: string): Promise<WalletRecord> {
    return recordSchema.parse(
      await this.requestJson('/records', {
        method: 'POST',
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
        body: JSON.stringify(createRecordBodySchema.parse(body)),
      }),
    );
  }

  async update(id: string, body: UpdateRecordBody): Promise<WalletRecord> {
    return recordSchema.parse(
      await this.requestJson(`/records/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updateRecordBodySchema.parse(body)),
      }),
    );
  }

  async delete(id: string): Promise<void> {
    await this.requestJson(`/records/${id}`, { method: 'DELETE' }, { allowEmpty: true });
  }

  private async headers(hasBody: boolean): Promise<HeadersInit> {
    const session = await this.sessions.get();
    if (!session) {
      throw new RecordApiError('unauthorized');
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
      throw new RecordApiError('unauthorized');
    }
    try {
      await this.sessions.save(await this.auth.refresh(session.refreshToken));
    } catch (error) {
      if (error instanceof AuthApiError) {
        throw new RecordApiError(error.code);
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
        ...(await this.headers(init.body != null)),
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
