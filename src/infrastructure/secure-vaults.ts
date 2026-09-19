import type { PinVault, SessionVault } from '@/domain/ports';
import type { PinRecord, Session } from '@/domain/session';

import type { SecretStore } from './secret-store';

const PIN_KEY = 'wallet.pin';
const SESSION_KEY = 'wallet.session';

export class SecurePinVault implements PinVault {
  constructor(private readonly secrets: SecretStore) {}

  async get(): Promise<PinRecord | null> {
    const raw = await this.secrets.getItem(PIN_KEY);
    return raw ? (JSON.parse(raw) as PinRecord) : null;
  }

  async save(record: PinRecord): Promise<void> {
    await this.secrets.setItem(PIN_KEY, JSON.stringify(record));
  }
}

export class SecureSessionVault implements SessionVault {
  constructor(private readonly secrets: SecretStore) {}

  async get(): Promise<Session | null> {
    const raw = await this.secrets.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  }

  async save(session: Session): Promise<void> {
    await this.secrets.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async clear(): Promise<void> {
    await this.secrets.deleteItem(SESSION_KEY);
  }
}
