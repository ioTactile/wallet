import { InvalidEmail } from './errors.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(readonly value: string) {}

  static parse(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (value.length === 0 || value.length > 255 || !EMAIL_RE.test(value)) {
      throw new InvalidEmail();
    }
    return new Email(value);
  }
}
