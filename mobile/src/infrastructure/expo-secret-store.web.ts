import { MemorySecretStore } from './memory-secret-store';
import type { SecretStore } from './secret-store';

export const secretStore: SecretStore = new MemorySecretStore();
