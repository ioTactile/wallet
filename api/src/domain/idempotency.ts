export type IdempotencyStatus = 'processing' | 'completed';

export type IdempotencyRecord = {
  userId: string;
  key: string;
  method: string;
  path: string;
  requestHash: string;
  status: IdempotencyStatus;
  responseStatus: number | null;
  responseBody: string | null;
  createdAt: Date;
};

export type IdempotencyClaimCommand = {
  userId: string;
  key: string;
  method: string;
  path: string;
  requestHash: string;
  now: Date;
  reclaimAfterMs: number;
};

export type IdempotencyClaimResult =
  | { type: 'claimed' }
  | { type: 'replay'; entry: IdempotencyRecord }
  | { type: 'conflict_body' }
  | { type: 'in_progress' };
