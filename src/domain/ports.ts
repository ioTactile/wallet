import type { PinRecord, Session } from './session';

export interface PinVault {
  get(): Promise<PinRecord | null>;
  save(record: PinRecord): Promise<void>;
}

export interface SessionVault {
  get(): Promise<Session | null>;
  save(session: Session): Promise<void>;
  clear(): Promise<void>;
}

export interface PinHasher {
  generateSalt(): Promise<string>;
  hash(pin: string, salt: string): Promise<string>;
}

export interface AuthApi {
  register(email: string, password: string): Promise<Session>;
  login(email: string, password: string): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  logout(refreshToken: string): Promise<void>;
  me(accessToken: string): Promise<Session['user']>;
}

export class AuthApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'AuthApiError';
  }
}
