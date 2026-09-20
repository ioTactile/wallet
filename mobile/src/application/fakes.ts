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
  users = new Map<string, { password: string; id: string; firstName: string; lastName: string }>();

  async register(email: string, password: string): Promise<Session> {
    if (this.users.has(email)) {
      throw new AuthApiError('email_already_taken');
    }
    this.users.set(email, { password, id: 'user-1', firstName: '', lastName: '' });
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

  async me(accessToken: string): Promise<Session['user']> {
    void accessToken;
    return { id: 'user-1', email: 'jordan@example.com', firstName: '', lastName: '' };
  }

  async updateProfile(
    accessToken: string,
    profile: { firstName: string; lastName: string },
  ): Promise<Session['user']> {
    void accessToken;
    const entry = [...this.users.values()][0];
    if (!entry) {
      throw new AuthApiError('unauthorized');
    }
    entry.firstName = profile.firstName;
    entry.lastName = profile.lastName;
    return {
      id: entry.id,
      email: [...this.users.keys()][0]!,
      firstName: profile.firstName,
      lastName: profile.lastName,
    };
  }

  private session(email: string): Session {
    const user = this.users.get(email)!;
    return {
      user: {
        id: user.id,
        email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      accessToken: 'access',
      refreshToken: 'refresh',
    };
  }
}
