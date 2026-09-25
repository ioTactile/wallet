import type { CreateAccountBody, CreateRecordBody } from '@wallet/shared';

export type PendingWrite =
  | {
      id: string;
      kind: 'create_record';
      body: CreateRecordBody;
      idempotencyKey: string;
      enqueuedAt: string;
    }
  | {
      id: string;
      kind: 'create_account';
      body: CreateAccountBody;
      idempotencyKey: string;
      enqueuedAt: string;
    };
