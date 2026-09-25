import { describe, expect, it } from '@jest/globals';

import { MemorySecretStore } from './memory-secret-store';

describe('MemorySecretStore', () => {
  it('stores values only in memory and can delete them', async () => {
    const store = new MemorySecretStore();
    await store.setItem('wallet.pin', '{"salt":"s","hash":"h"}');
    await expect(store.getItem('wallet.pin')).resolves.toBe('{"salt":"s","hash":"h"}');
    await store.deleteItem('wallet.pin');
    await expect(store.getItem('wallet.pin')).resolves.toBeNull();
  });

  it('does not share state across instances', async () => {
    const first = new MemorySecretStore();
    const second = new MemorySecretStore();
    await first.setItem('wallet.session', 'secret');
    await expect(second.getItem('wallet.session')).resolves.toBeNull();
  });
});
