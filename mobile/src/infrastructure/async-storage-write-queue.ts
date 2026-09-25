import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';
import { createAccountBodySchema, createRecordBodySchema } from '@wallet/shared';

import type { PendingWrite } from '@/domain/pending-write';
import type { WriteQueue } from '@/domain/ports';

const STORAGE_KEY = 'wallet.writeQueue';

const pendingWriteSchema = z.discriminatedUnion('kind', [
  z.object({
    id: z.string().min(1),
    kind: z.literal('create_record'),
    body: createRecordBodySchema,
    idempotencyKey: z.string().min(1),
    enqueuedAt: z.string().min(1),
  }),
  z.object({
    id: z.string().min(1),
    kind: z.literal('create_account'),
    body: createAccountBodySchema,
    idempotencyKey: z.string().min(1),
    enqueuedAt: z.string().min(1),
  }),
]);

const queueSchema = z.array(pendingWriteSchema);

export class AsyncStorageWriteQueue implements WriteQueue {
  async list(): Promise<PendingWrite[]> {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = queueSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  }

  async enqueue(item: PendingWrite): Promise<void> {
    const current = await this.list();
    const next = [...current.filter((entry) => entry.id !== item.id), item];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async remove(id: string): Promise<void> {
    const next = (await this.list()).filter((item) => item.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}
