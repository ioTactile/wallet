import type { SecretStore } from './secret-store';

export const secretStore: SecretStore = {
  async getItem(key) {
    return globalThis.localStorage.getItem(key);
  },
  async setItem(key, value) {
    globalThis.localStorage.setItem(key, value);
  },
  async deleteItem(key) {
    globalThis.localStorage.removeItem(key);
  },
};
