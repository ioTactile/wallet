import { Email } from '../domain/email.js';
import { InvalidCredentials } from '../domain/errors.js';
import { Password } from '../domain/password.js';
import type {
  Clock,
  Hasher,
  IdGenerator,
  RefreshTokenRepository,
  TokenIssuer,
  UserRepository,
} from '../domain/ports.js';
import { RefreshToken } from '../domain/refresh-token.js';
import type { User } from '../domain/user.js';
import { toSession, type Session } from './session.js';

export class LoginUser {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly hasher: Hasher,
    private readonly tokens: TokenIssuer,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: { email: string; password: string }): Promise<Session> {
    const email = Email.parse(input.email);
    const password = Password.parse(input.password);
    const user = await this.users.findByEmail(email);

    if (!user || !(await this.hasher.verify(password.value, user.passwordHash))) {
      throw new InvalidCredentials();
    }

    return this.openSession(user);
  }

  private async openSession(user: User): Promise<Session> {
    const issued = this.tokens.issueRefresh();
    await this.refreshTokens.save(
      new RefreshToken(this.ids.generate(), user.id, issued.tokenHash, issued.expiresAt, null),
    );
    return toSession(user, this.tokens.issueAccess(user.id), issued.raw);
  }
}
