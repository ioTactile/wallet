import { describe, expect, it } from 'vitest';

import { IdempotencyInProgress, IdempotencyKeyConflict } from '../domain/errors.js';
import { FixedClock, InMemoryIdempotencyStore } from './fakes.js';
import { RunIdempotent } from './run-idempotent.js';

function requestHash(value: unknown): string {
  return JSON.stringify(value);
}

describe('RunIdempotent', () => {
  const clock = new FixedClock(new Date('2026-09-20T10:00:00.000Z'));

  function sut(store = new InMemoryIdempotencyStore()) {
    return { store, run: new RunIdempotent(store, clock) };
  }

  it('runs once and replays the same response for the same key and body', async () => {
    const { run } = sut();
    let calls = 0;
    const input = {
      userId: 'user-1',
      key: 'key-1',
      method: 'POST',
      path: '/records',
      requestHash: requestHash({ amountCents: 100 }),
      run: async () => {
        calls += 1;
        return { status: 201, body: { id: 'rec-1' } };
      },
    };

    const first = await run.execute(input);
    const second = await run.execute(input);

    expect(first).toEqual({ status: 201, body: { id: 'rec-1' } });
    expect(second).toEqual(first);
    expect(calls).toBe(1);
  });

  it('rejects the same key with a different request body', async () => {
    const { run } = sut();
    await run.execute({
      userId: 'user-1',
      key: 'key-1',
      method: 'POST',
      path: '/records',
      requestHash: requestHash({ amountCents: 100 }),
      run: async () => ({ status: 201, body: { id: 'rec-1' } }),
    });

    await expect(
      run.execute({
        userId: 'user-1',
        key: 'key-1',
        method: 'POST',
        path: '/records',
        requestHash: requestHash({ amountCents: 200 }),
        run: async () => ({ status: 201, body: { id: 'rec-2' } }),
      }),
    ).rejects.toBeInstanceOf(IdempotencyKeyConflict);
  });

  it('rejects concurrent claims while a request is still processing', async () => {
    const { run } = sut();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const first = run.execute({
      userId: 'user-1',
      key: 'key-1',
      method: 'POST',
      path: '/records',
      requestHash: requestHash({ amountCents: 100 }),
      run: async () => {
        await gate;
        return { status: 201, body: { id: 'rec-1' } };
      },
    });

    await expect(
      run.execute({
        userId: 'user-1',
        key: 'key-1',
        method: 'POST',
        path: '/records',
        requestHash: requestHash({ amountCents: 100 }),
        run: async () => ({ status: 201, body: { id: 'rec-2' } }),
      }),
    ).rejects.toBeInstanceOf(IdempotencyInProgress);

    release();
    await expect(first).resolves.toEqual({ status: 201, body: { id: 'rec-1' } });
  });

  it('abandons a failed run so the same key can retry', async () => {
    const { run } = sut();
    let calls = 0;

    await expect(
      run.execute({
        userId: 'user-1',
        key: 'key-1',
        method: 'POST',
        path: '/records',
        requestHash: requestHash({ amountCents: 100 }),
        run: async () => {
          calls += 1;
          throw new Error('boom');
        },
      }),
    ).rejects.toThrow('boom');

    const ok = await run.execute({
      userId: 'user-1',
      key: 'key-1',
      method: 'POST',
      path: '/records',
      requestHash: requestHash({ amountCents: 100 }),
      run: async () => {
        calls += 1;
        return { status: 201, body: { id: 'rec-1' } };
      },
    });

    expect(ok.body).toEqual({ id: 'rec-1' });
    expect(calls).toBe(2);
  });

  it('reclaims a stale processing lock after the reclaim window', async () => {
    const store = new InMemoryIdempotencyStore();
    const { run } = sut(store);
    await store.claim({
      userId: 'user-1',
      key: 'key-1',
      method: 'POST',
      path: '/records',
      requestHash: requestHash({ amountCents: 100 }),
      now: clock.now(),
      reclaimAfterMs: 120_000,
    });

    clock.advance(120_001);

    const recovered = await run.execute({
      userId: 'user-1',
      key: 'key-1',
      method: 'POST',
      path: '/records',
      requestHash: requestHash({ amountCents: 100 }),
      run: async () => ({ status: 201, body: { id: 'fresh' } }),
    });

    expect(recovered.body).toEqual({ id: 'fresh' });
  });
});
