import { accountsResponseSchema, recordSchema, recordsResponseSchema } from '@wallet/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { startTestApp } from './test-server.js';

const FROM = '2026-09-01T00:00:00.000Z';
const TO = '2026-09-30T23:59:59.000Z';

describe('records HTTP', () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it('creates, lists, updates and deletes a cash expense, and derives account balance', async () => {
    app = await startTestApp();

    const registered = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    const session = registered.json();
    const auth = { authorization: `Bearer ${session.accessToken}` };

    const anonymous = await app.inject({ method: 'GET', url: `/records?from=${FROM}&to=${TO}` });
    expect(anonymous.statusCode).toBe(401);

    const accounts = accountsResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/accounts', headers: auth })).json(),
    );
    const cash = accounts.accounts[0];
    expect(cash?.kind).toBe('cash');

    const created = await app.inject({
      method: 'POST',
      url: '/records',
      headers: { ...auth, 'idempotency-key': 'rec-create-1' },
      payload: {
        kind: 'expense',
        accountId: cash?.id,
        categoryId: 'food_drinks.groceries',
        amountCents: 199,
        note: 'Courses',
      },
    });
    expect(created.statusCode).toBe(201);
    const expense = recordSchema.parse(created.json());
    expect(expense.kind).toBe('expense');
    if (expense.kind !== 'expense') throw new Error('expected expense');
    expect(expense.amountCents).toBe(199);
    expect(expense.accountId).toBe(cash?.id);

    const listed = recordsResponseSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: `/records?from=${FROM}&to=${TO}`,
          headers: auth,
        })
      ).json(),
    );
    expect(listed.records).toHaveLength(1);
    expect(listed.periodNetCents).toBe(-199);

    const balanced = accountsResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/accounts', headers: auth })).json(),
    );
    expect(balanced.accounts[0]?.balanceCents).toBe(-199);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/records/${expense.id}`,
      headers: auth,
      payload: { note: 'Amazon', clearing: 'uncleared' },
    });
    expect(patched.statusCode).toBe(200);
    expect(recordSchema.parse(patched.json())).toMatchObject({
      note: 'Amazon',
      clearing: 'uncleared',
    });

    const bank = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { ...auth, 'idempotency-key': 'acc-bank-1' },
      payload: { kind: 'bank', name: 'CIC' },
    });
    const bankId = bank.json().id as string;

    const onBank = await app.inject({
      method: 'POST',
      url: '/records',
      headers: { ...auth, 'idempotency-key': 'rec-on-bank-1' },
      payload: {
        kind: 'expense',
        accountId: bankId,
        categoryId: 'food_drinks',
        amountCents: 100,
      },
    });
    expect(onBank.statusCode).toBe(400);
    expect(onBank.json()).toEqual({ error: 'manual_record_on_bank' });

    const transfer = await app.inject({
      method: 'POST',
      url: '/records',
      headers: { ...auth, 'idempotency-key': 'rec-transfer-1' },
      payload: {
        kind: 'transfer',
        fromAccountId: cash?.id,
        toAccountId: bankId,
        amountCents: 500,
      },
    });
    expect(transfer.statusCode).toBe(201);
    expect(recordSchema.parse(transfer.json()).kind).toBe('transfer');

    const converted = await app.inject({
      method: 'PATCH',
      url: `/records/${expense.id}`,
      headers: auth,
      payload: { kind: 'transfer', toAccountId: bankId },
    });
    expect(converted.statusCode).toBe(200);
    const asTransfer = recordSchema.parse(converted.json());
    expect(asTransfer.kind).toBe('transfer');
    if (asTransfer.kind !== 'transfer') throw new Error('expected transfer');
    expect(asTransfer.fromAccountId).toBe(cash?.id);
    expect(asTransfer.toAccountId).toBe(bankId);

    const restored = await app.inject({
      method: 'PATCH',
      url: `/records/${expense.id}`,
      headers: auth,
      payload: { kind: 'expense', categoryId: 'food_drinks.groceries' },
    });
    expect(restored.statusCode).toBe(200);
    expect(recordSchema.parse(restored.json()).kind).toBe('expense');

    const blocked = await app.inject({
      method: 'DELETE',
      url: `/accounts/${bankId}`,
      headers: auth,
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json()).toEqual({ error: 'cannot_delete_account_with_records' });

    const removed = await app.inject({
      method: 'DELETE',
      url: `/records/${expense.id}`,
      headers: auth,
    });
    expect(removed.statusCode).toBe(204);
  });
});
