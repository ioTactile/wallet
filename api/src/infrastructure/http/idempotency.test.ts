import { describe, expect, it } from 'vitest';

import { InvalidIdempotencyKey, MissingIdempotencyKey } from '../../domain/errors.js';
import { hashIdempotencyPayload, parseIdempotencyKey } from './idempotency.js';

describe('idempotency HTTP helpers', () => {
  it('requires a single Idempotency-Key header', () => {
    expect(() => parseIdempotencyKey({})).toThrow(MissingIdempotencyKey);
    expect(parseIdempotencyKey({ 'idempotency-key': 'abc-123' })).toBe('abc-123');
  });

  it('rejects an invalid Idempotency-Key', () => {
    expect(() => parseIdempotencyKey({ 'idempotency-key': 'has space' })).toThrow(
      InvalidIdempotencyKey,
    );
  });

  it('hashes a payload stably', () => {
    expect(hashIdempotencyPayload({ amountCents: 100 })).toBe(
      hashIdempotencyPayload({ amountCents: 100 }),
    );
    expect(hashIdempotencyPayload({ amountCents: 100 })).not.toBe(
      hashIdempotencyPayload({ amountCents: 200 }),
    );
  });
});
