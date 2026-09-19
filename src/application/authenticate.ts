import type { AuthApi, SessionVault } from '@/domain/ports';
import type { Session } from '@/domain/session';

export class RegisterAccount {
  constructor(
    private readonly api: AuthApi,
    private readonly sessions: SessionVault,
  ) {}

  async execute(email: string, password: string): Promise<Session> {
    const session = await this.api.register(email, password);
    await this.sessions.save(session);
    return session;
  }
}

export class LoginAccount {
  constructor(
    private readonly api: AuthApi,
    private readonly sessions: SessionVault,
  ) {}

  async execute(email: string, password: string): Promise<Session> {
    const session = await this.api.login(email, password);
    await this.sessions.save(session);
    return session;
  }
}

export class LogoutAccount {
  constructor(
    private readonly api: AuthApi,
    private readonly sessions: SessionVault,
  ) {}

  async execute(): Promise<void> {
    const session = await this.sessions.get();
    if (session) {
      await this.api.logout(session.refreshToken).catch(() => undefined);
    }
    await this.sessions.clear();
  }
}

export class HydrateAuth {
  constructor(
    private readonly pins: { get(): Promise<unknown> },
    private readonly sessions: SessionVault,
  ) {}

  async execute(): Promise<{ pinConfigured: boolean; session: Session | null }> {
    const [pin, session] = await Promise.all([this.pins.get(), this.sessions.get()]);
    return { pinConfigured: pin !== null, session };
  }
}
