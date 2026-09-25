import { createHash } from 'node:crypto';

import { idempotencyKeySchema } from '@wallet/shared';

import { InvalidIdempotencyKey, MissingIdempotencyKey } from '../../domain/errors.js';

export function hashIdempotencyPayload(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function parseIdempotencyKey(
  headers: Record<string, string | string[] | undefined>,
): string {
  const raw = headers['idempotency-key'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value === '') {
    throw new MissingIdempotencyKey();
  }
  const parsed = idempotencyKeySchema.safeParse(value);
  if (!parsed.success) {
    throw new InvalidIdempotencyKey();
  }
  return parsed.data;
}
