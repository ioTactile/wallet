import { randomUUID } from 'node:crypto';

import type { IdGenerator } from '../../domain/ports.js';

export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return randomUUID();
  }
}
