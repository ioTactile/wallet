import * as SecureStore from 'expo-secure-store';

import type { SecretStore } from './secret-store';

export const secretStore: SecretStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItem: (key) => SecureStore.deleteItemAsync(key),
};
