import {
  accountSchema,
  accountsResponseSchema,
  DEFAULT_ACCOUNT_COLOR,
  DEFAULT_CASH_ACCOUNT_ID,
} from '@wallet/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { startTestApp } from './test-server.js';

describe('accounts HTTP', () => {
  let app: Awaited<ReturnType<typeof startTestApp>>;

  afterEach(async () => {
    await app?.close();
  });

  it('registers a default Espèces account, supports cash CRUD, and rejects deleting the last cash', async () => {
    app = await startTestApp();

    const created = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { email: 'jordan@example.com', password: 'longenough' },
    });
    expect(created.statusCode).toBe(201);
    const session = created.json();
    const auth = { authorization: `Bearer ${session.accessToken}` };

    const anonymous = await app.inject({ method: 'GET', url: '/accounts' });
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.json()).toEqual({ error: 'unauthorized' });

    const listed = await app.inject({ method: 'GET', url: '/accounts', headers: auth });
    expect(listed.statusCode).toBe(200);
    const listBody = accountsResponseSchema.parse(listed.json());
    expect(listBody.accounts).toHaveLength(1);
    const species = listBody.accounts[0];
    expect(species?.kind).toBe('cash');
    expect(species?.name).toBe('Espèces');
    expect(species?.color).toBe(DEFAULT_ACCOUNT_COLOR);
    expect(species?.balanceCents).toBe(0);
    expect(species?.id).not.toBe(DEFAULT_CASH_ACCOUNT_ID);
    expect(species).not.toHaveProperty('iban');

    const posted = await app.inject({
      method: 'POST',
      url: '/accounts',
      headers: { ...auth, 'idempotency-key': 'acc-cash-1' },
      payload: { kind: 'cash', name: 'Coffre' },
    });
    expect(posted.statusCode).toBe(201);
    const coffre = accountSchema.parse(posted.json());
    expect(coffre.kind).toBe('cash');
    expect(coffre.name).toBe('Coffre');
    expect(coffre.balanceCents).toBe(0);

    const fetched = await app.inject({
      method: 'GET',
      url: `/accounts/${coffre.id}`,
      headers: auth,
    });
    expect(fetched.statusCode).toBe(200);
    expect(accountSchema.parse(fetched.json()).id).toBe(coffre.id);

    const patched = await app.inject({
      method: 'PATCH',
      url: `/accounts/${coffre.id}`,
      headers: auth,
      payload: { name: 'Vacances', color: '#42a5f5' },
    });
    expect(patched.statusCode).toBe(200);
    expect(accountSchema.parse(patched.json())).toMatchObject({
      name: 'Vacances',
      color: '#42A5F5',
      kind: 'cash',
    });

    const archived = await app.inject({
      method: 'POST',
      url: `/accounts/${coffre.id}/archive`,
      headers: auth,
      payload: { archived: true },
    });
    expect(archived.statusCode).toBe(200);
    expect(accountSchema.parse(archived.json()).archivedAt).toBeTruthy();

    const afterArchive = accountsResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/accounts', headers: auth })).json(),
    );
    expect(afterArchive.accounts.map((account) => account.id)).toEqual([species?.id]);

    const withArchived = accountsResponseSchema.parse(
      (
        await app.inject({
          method: 'GET',
          url: '/accounts?includeArchived=true',
          headers: auth,
        })
      ).json(),
    );
    expect(withArchived.accounts.map((account) => account.id)).toEqual([species?.id, coffre.id]);
    expect(
      withArchived.accounts.find((account) => account.id === coffre.id)?.archivedAt,
    ).toBeTruthy();

    const restored = await app.inject({
      method: 'POST',
      url: `/accounts/${coffre.id}/archive`,
      headers: auth,
      payload: { archived: false },
    });
    expect(restored.statusCode).toBe(200);
    expect(accountSchema.parse(restored.json()).archivedAt).toBeNull();

    const afterRestore = accountsResponseSchema.parse(
      (await app.inject({ method: 'GET', url: '/accounts', headers: auth })).json(),
    );
    expect(afterRestore.accounts.map((account) => account.id)).toEqual([species?.id, coffre.id]);

    const deletedExtra = await app.inject({
      method: 'DELETE',
      url: `/accounts/${coffre.id}`,
      headers: { ...auth, 'content-type': 'application/json' },
    });
    expect(deletedExtra.statusCode).toBe(204);

    const deletedLast = await app.inject({
      method: 'DELETE',
      url: `/accounts/${species?.id}`,
      headers: auth,
    });
    expect(deletedLast.statusCode).toBe(409);
    expect(deletedLast.json()).toEqual({ error: 'cannot_delete_last_cash_account' });
  });
});
