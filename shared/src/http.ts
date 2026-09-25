import { z } from 'zod';

/** Header name for write idempotency (Stripe-style). */
export const IDEMPOTENCY_KEY_HEADER = 'Idempotency-Key';

/** Opaque client key: 1–128 printable ASCII characters. */
export const idempotencyKeySchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[!-~]+$/, 'Idempotency-Key must be printable ASCII');

export type IdempotencyKey = z.infer<typeof idempotencyKeySchema>;
