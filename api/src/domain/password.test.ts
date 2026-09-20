import { describe, expect, it } from 'vitest';

import { WeakPassword } from './errors.js';
import { Password } from './password.js';

describe('Password', () => {
  it('accepts a secret between 8 and 128 characters', () => {
    expect(Password.parse('longenough').value).toBe('longenough');
  });

  it('rejects a short password', () => {
    expect(() => Password.parse('short')).toThrow(WeakPassword);
  });
});
