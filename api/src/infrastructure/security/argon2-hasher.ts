import argon2 from 'argon2';

import type { Hasher } from '../../domain/ports.js';

type HashOptions = {
  memoryCost?: number;
  timeCost?: number;
};

export class Argon2Hasher implements Hasher {
  constructor(private readonly options?: HashOptions) {}

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options) as Promise<string>;
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }
}
