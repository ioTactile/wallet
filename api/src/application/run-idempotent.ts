import { IdempotencyInProgress, IdempotencyKeyConflict } from '../domain/errors.js';
import type { Clock, IdempotencyStore } from '../domain/ports.js';

/** How long a crashed "processing" lock may be reclaimed by a retry. */
export const IDEMPOTENCY_RECLAIM_MS = 120_000;

export class RunIdempotent {
  constructor(
    private readonly store: IdempotencyStore,
    private readonly clock: Clock,
  ) {}

  async execute<T>(input: {
    userId: string;
    key: string;
    method: string;
    path: string;
    requestHash: string;
    run: () => Promise<{ status: number; body: T }>;
  }): Promise<{ status: number; body: T }> {
    const claim = await this.store.claim({
      userId: input.userId,
      key: input.key,
      method: input.method,
      path: input.path,
      requestHash: input.requestHash,
      now: this.clock.now(),
      reclaimAfterMs: IDEMPOTENCY_RECLAIM_MS,
    });

    if (claim.type === 'conflict_body') {
      throw new IdempotencyKeyConflict();
    }
    if (claim.type === 'in_progress') {
      throw new IdempotencyInProgress();
    }
    if (claim.type === 'replay') {
      if (claim.entry.responseStatus == null || claim.entry.responseBody == null) {
        throw new IdempotencyInProgress();
      }
      return {
        status: claim.entry.responseStatus,
        body: JSON.parse(claim.entry.responseBody) as T,
      };
    }

    try {
      const result = await input.run();
      await this.store.complete(
        input.userId,
        input.key,
        result.status,
        JSON.stringify(result.body),
      );
      return result;
    } catch (error) {
      await this.store.abandon(input.userId, input.key);
      throw error;
    }
  }
}
