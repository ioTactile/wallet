import { describe, expect, it } from 'vitest';

import { Email } from './email.js';
import { InvalidEmail } from './errors.js';

describe('Email', () => {
  it('trims and lowercases a valid address', () => {
    expect(Email.parse('  Jordan@Example.com ').value).toBe('jordan@example.com');
  });

  it('rejects an empty or malformed address', () => {
    expect(() => Email.parse('')).toThrow(InvalidEmail);
    expect(() => Email.parse('not-an-email')).toThrow(InvalidEmail);
  });
});
