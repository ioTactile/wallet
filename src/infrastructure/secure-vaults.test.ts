import { describe, expect, it } from '@jest/globals';

import type { SecretStore } from './secret-store';
import { SecurePinVault, SecureSessionVault } from './secure-vaults';

class MemorySecrets implements SecretStore {
  private readonly values = new Map<string, string>();

  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  async deleteItem(key: string) {
    this.values.delete(key);
  }
}

describe('SecurePinVault', () => {
  it('round-trips a PIN record as JSON', async () => {
    const vault = new SecurePinVault(new MemorySecrets());
    await vault.save({ salt: 's', hash: 'h' });
    await expect(vault.get()).resolves.toEqual({ salt: 's', hash: 'h' });
  });
});

describe('SecureSessionVault', () => {
  it('saves, reads, and clears a session', async () => {
    const vault = new SecureSessionVault(new MemorySecrets());
    const session = {
      user: { id: 'user-1', email: 'jordan@example.com' },
      accessToken: 'access',
      refreshToken: 'refresh',
    };
    await vault.save(session);
    await expect(vault.get()).resolves.toEqual(session);
    await vault.clear();
    await expect(vault.get()).resolves.toBeNull();
  });
});
