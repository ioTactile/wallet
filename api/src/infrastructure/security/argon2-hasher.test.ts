import { describe, expect, it } from 'vitest';

import { Argon2Hasher } from './argon2-hasher.js';

describe('Argon2Hasher', () => {
  it('hashes and verifies a password', async () => {
    const hasher = new Argon2Hasher({ memoryCost: 4096, timeCost: 1 });
    const hash = await hasher.hash('longenough');
    expect(hash).not.toContain('longenough');
    expect(await hasher.verify('longenough', hash)).toBe(true);
    expect(await hasher.verify('wrongpass', hash)).toBe(false);
  });
});
