import { WeakPassword } from './errors.js';

export class Password {
  private constructor(readonly value: string) {}

  static parse(raw: string): Password {
    if (raw.length < 8 || raw.length > 128) {
      throw new WeakPassword();
    }
    return new Password(raw);
  }
}
