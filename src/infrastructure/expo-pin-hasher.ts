import * as Crypto from 'expo-crypto';

import type { PinHasher } from '@/domain/ports';

export class ExpoPinHasher implements PinHasher {
  async generateSalt(): Promise<string> {
    const bytes = await Crypto.getRandomBytesAsync(16);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async hash(pin: string, salt: string): Promise<string> {
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
  }
}
