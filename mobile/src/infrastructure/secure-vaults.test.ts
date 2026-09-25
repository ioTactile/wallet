import { describe, expect, it } from '@jest/globals';

import { MemorySecretStore } from './memory-secret-store';
import { SecurePinVault, SecureSessionVault } from './secure-vaults';

describe('SecurePinVault', () => {
  it('round-trips a PIN record as JSON', async () => {
    const vault = new SecurePinVault(new MemorySecretStore());
    await vault.save({ salt: 's', hash: 'h' });
    await expect(vault.get()).resolves.toEqual({ salt: 's', hash: 'h' });
  });
});

describe('SecureSessionVault', () => {
  it('saves, reads, and clears a session', async () => {
    const vault = new SecureSessionVault(new MemorySecretStore());
    const session = {
      user: {
        id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
        email: 'jordan@example.com',
        firstName: 'Jordan',
        lastName: 'Dupont',
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    };
    await vault.save(session);
    await expect(vault.get()).resolves.toEqual(session);
    await vault.clear();
    await expect(vault.get()).resolves.toBeNull();
  });

  it('defaults missing profile names from an older vault payload', async () => {
    const secrets = new MemorySecretStore();
    await secrets.setItem(
      'wallet.session',
      JSON.stringify({
        user: {
          id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
          email: 'jordan@example.com',
        },
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    );
    const vault = new SecureSessionVault(secrets);
    await expect(vault.get()).resolves.toEqual({
      user: {
        id: '3b8d1f2a-6c5e-4d0b-9f11-2a4c6e8b0d12',
        email: 'jordan@example.com',
        firstName: '',
        lastName: '',
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });
});
