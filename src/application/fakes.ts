import type { AuthApi, PinHasher, PinVault, SessionVault } from '@/domain/ports';
import { AuthApiError } from '@/domain/ports';
import type { PinRecord, Session } from '@/domain/session';

export class InMemoryPinVault implements PinVault {
  record: PinRecord | null = null;

  async get() {
    return this.record;
  }

  async save(record: PinRecord) {
    this.record = record;
  }
}

export class InMemorySessionVault implements SessionVault {
  session: Session | null = null;

  async get() {
    return this.session;
  }

  async save(session: Session) {
    this.session = session;
  }

  async clear() {
    this.session = null;
  }
}

export class FakePinHasher implements PinHasher {
  async generateSalt() {
    return 'salt';
  }

  async hash(pin: string, salt: string) {
    return `${salt}:${pin}`;
  }
}

export class FakeAuthApi implements AuthApi {
  users = new Map<string, { password: string; id: string }>();

  async register(email: string, password: string): Promise<Session> {
    if (this.users.has(email)) {
      throw new AuthApiError('email_already_taken');
    }
    this.users.set(email, { password, id: 'user-1' });
    return this.session(email);
  }

  async login(email: string, password: string): Promise<Session> {
    const user = this.users.get(email);
    if (!user || user.password !== password) {
      throw new AuthApiError('invalid_credentials');
    }
    return this.session(email);
  }

  async refresh(): Promise<Session> {
    throw new AuthApiError('invalid_refresh_token');
  }

  async logout(): Promise<void> {}

  async me(): Promise<Session['user']> {
    return { id: 'user-1', email: 'jordan@example.com' };
  }

  private session(email: string): Session {
    return {
      user: { id: 'user-1', email },
      accessToken: 'access',
      refreshToken: 'refresh',
    };
  }
}
