import {
  accountSchema,
  accountsResponseSchema,
  recordSchema,
  recordsResponseSchema,
  startBankConnectionResponseSchema,
  syncBankAccountResponseSchema,
} from '@wallet/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { startTestApp } from './test-server.js';

const FROM = '2026-09-01T00:00:00.000Z';
const TO = '2026-09-30T23:59:59.000Z';
const REDIRECT = 'mobile://bank/callback';

describe('bank HTTP', () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it('connects the sandbox bank, imports records, resyncs and disconnects', async () => {
    app = await startTestApp();

    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const session = registered.json();
    const auth = { authorization: `Bearer ${session.accessToken}` };

    const anonymous = await app.inject({
      method: 'POST',
      url: '/bank/connections',
      payload: { redirectUri: REDIRECT },
    });
    expect(anonymous.statusCode).toBe(401);

    const started = await app.inject({
      method: 'POST',
      url: '/bank/connections',
      headers: auth,
      payload: { redirectUri: REDIRECT },
    });
    expect(started.statusCode).toBe(201);
    const consent = startBankConnectionResponseSchema.parse(started.json());
    expect(consent.authorizationUrl).toContain('/bank/sandbox/authorize');

    const authorize = await app.inject({
      method: 'GET',
      url: `/bank/sandbox/authorize?connectionId=${consent.id}&redirect_uri=${encodeURIComponent(REDIRECT)}`,
    });
    expect(authorize.statusCode).toBe(200);
    expect(authorize.headers['content-type']).toContain('text/html');
    expect(authorize.body).toContain('Banque démo');
    expect(authorize.body).toContain('target="_top"');
    expect(authorize.body).toContain(`connectionId=${consent.id}`);
    expect(authorize.headers['content-security-policy']).toContain('frame-ancestors');

    const completed = await app.inject({
      method: 'POST',
      url: `/bank/connections/${consent.id}/complete`,
      headers: auth,
    });
    expect(completed.statusCode).toBe(200);
    const connected = accountsResponseSchema.parse(completed.json());
    expect(connected.accounts).toHaveLength(1);
    const bank = connected.accounts[0];
    expect(bank?.kind).toBe('bank');
    if (bank?.kind !== 'bank') throw new Error('expected bank');
    expect(bank.name).toBe('Compte courant');
    expect(bank.lastSyncedAt).toBeTruthy();

    const listed = recordsResponseSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/records?from=${FROM}&to=${TO}`,
          headers: auth,
        })
      ).json(),
    );
    expect(listed.records).toHaveLength(8);
    const expense = listed.records.find((record) => record.kind === 'expense');
    expect(expense?.kind).toBe('expense');
    if (expense?.kind !== 'expense') throw new Error('expected expense');

    const recategorized = await app.inject({
      method: 'PATCH',
      url: `/records/${expense.id}`,
      headers: auth,
      payload: { categoryId: 'food_drinks.groceries' },
    });
    expect(recategorized.statusCode).toBe(200);
    expect(recordSchema.parse(recategorized.json())).toMatchObject({
      categoryId: 'food_drinks.groceries',
    });

    const blockedAmount = await app.inject({
      method: 'PATCH',
      url: `/records/${expense.id}`,
      headers: auth,
      payload: { amountCents: 10 },
    });
    expect(blockedAmount.statusCode).toBe(400);
    expect(blockedAmount.json()).toEqual({ error: 'cannot_mutate_ais_record' });

    const blockedDelete = await app.inject({
      method: 'DELETE',
      url: `/records/${expense.id}`,
      headers: auth,
    });
    expect(blockedDelete.statusCode).toBe(409);
    expect(blockedDelete.json()).toEqual({ error: 'cannot_delete_ais_record' });

    const synced = await app.inject({
      method: 'POST',
      url: `/accounts/${bank.id}/sync`,
      headers: auth,
    });
    expect(synced.statusCode).toBe(200);
    expect(syncBankAccountResponseSchema.parse(synced.json())).toEqual({ importedCount: 0 });

    const again = recordsResponseSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/records?from=${FROM}&to=${TO}`,
          headers: auth,
        })
      ).json(),
    );
    expect(again.records.find((record) => record.id === expense.id)).toMatchObject({
      categoryId: 'food_drinks.groceries',
    });

    const disconnected = await app.inject({
      method: 'POST',
      url: `/accounts/${bank.id}/disconnect`,
      headers: auth,
    });
    expect(disconnected.statusCode).toBe(200);
    expect(accountSchema.parse(disconnected.json()).archivedAt).toBeTruthy();

    const resync = await app.inject({
      method: 'POST',
      url: `/accounts/${bank.id}/sync`,
      headers: auth,
    });
    expect(resync.statusCode).toBe(400);
    expect(resync.json()).toEqual({ error: 'cannot_sync_account' });
  });
});
