import * as Crypto from 'expo-crypto';

import type { IdGenerator } from '@/domain/ports';

export class ExpoIdGenerator implements IdGenerator {
  generate(): string {
    return Crypto.randomUUID();
  }
}
