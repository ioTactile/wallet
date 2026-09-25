import { describe, expect, it } from 'vitest';

import { IDEMPOTENCY_KEY_HEADER, idempotencyKeySchema } from './http.js';

describe('http idempotency', () => {
  it('exposes the canonical Idempotency-Key header name', () => {
    expect(IDEMPOTENCY_KEY_HEADER).toBe('Idempotency-Key');
  });

  it('accepts opaque printable keys up to 128 chars', () => {
    expect(idempotencyKeySchema.parse('a')).toBe('a');
    expect(idempotencyKeySchema.parse('3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12')).toBe(
      '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
    );
    expect(idempotencyKeySchema.parse('x'.repeat(128))).toHaveLength(128);
  });

  it('rejects empty, too long, or non-printable keys', () => {
    expect(() => idempotencyKeySchema.parse('')).toThrow();
    expect(() => idempotencyKeySchema.parse('x'.repeat(129))).toThrow();
    expect(() => idempotencyKeySchema.parse('has space')).toThrow();
    expect(() => idempotencyKeySchema.parse('café')).toThrow();
  });
});
