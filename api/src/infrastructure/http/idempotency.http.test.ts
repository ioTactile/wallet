import { IDEMPOTENCY_KEY_HEADER, accountsResponseSchema, recordSchema } from '@wallet/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { startTestApp } from './test-server.js';

describe('idempotency HTTP', () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;

  afterEach(async () => {
    await app?.close();
  });

  async function register() {
    app = await startTestApp();
    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const session = registered.json();
    const auth = { authorization: `Bearer ${session.accessToken}` };
    const accounts = accountsResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/accounts', headers: auth })).json(),
    );
    return { auth, cashId: accounts.accounts[0]!.id };
  }

  it('replays POST /records with the same Idempotency-Key without creating a duplicate', async () => {
    const { auth, cashId } = await register();
    const payload = {
      kind: 'expense' as const,
      accountId: cashId,
      categoryId: 'food_drinks.groceries',
      amountCents: 199,
    };
    const headers = { ...auth, [IDEMPOTENCY_KEY_HEADER]: 'same-key-1' };

    const first = await app.inject({ method: 'POST', url: '/records', headers, payload });
    const second = await app.inject({ method: 'POST', url: '/records', headers, payload });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json()).toEqual(first.json());
    expect(recordSchema.parse(first.json()).id).toBe(recordSchema.parse(second.json()).id);
  });

  it('rejects POST /records without Idempotency-Key', async () => {
    const { auth, cashId } = await register();
    const missing = await app.inject({
      method: 'POST',
      url: '/records',
      headers: auth,
      payload: {
        kind: 'expense',
        accountId: cashId,
        categoryId: 'food_drinks',
        amountCents: 100,
      },
    });
    expect(missing.statusCode).toBe(400);
    expect(missing.json()).toEqual({ error: 'missing_idempotency_key' });
  });

  it('rejects reusing an Idempotency-Key with a different body', async () => {
    const { auth, cashId } = await register();
    const headers = { ...auth, [IDEMPOTENCY_KEY_HEADER]: 'conflict-key' };

    await app.inject({
      method: 'POST',
      url: '/records',
      headers,
      payload: {
        kind: 'expense',
        accountId: cashId,
        categoryId: 'food_drinks',
        amountCents: 100,
      },
    });

    const conflict = await app.inject({
      method: 'POST',
      url: '/records',
      headers,
      payload: {
        kind: 'expense',
        accountId: cashId,
        categoryId: 'food_drinks',
        amountCents: 200,
      },
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toEqual({ error: 'idempotency_key_conflict' });
  });

  it('replays POST /accounts with the same Idempotency-Key', async () => {
    const { auth } = await register();
    const headers = { ...auth, [IDEMPOTENCY_KEY_HEADER]: 'acc-replay' };
    const payload = { kind: 'cash' as const, name: 'Coffre' };

    const first = await app.inject({ method: 'POST', url: '/accounts', headers, payload });
    const second = await app.inject({ method: 'POST', url: '/accounts', headers, payload });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json()).toEqual(first.json());
  });
});
