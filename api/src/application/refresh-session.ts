import { InvalidRefreshToken } from '../domain/errors.js';
import type {
  Clock,
  IdGenerator,
  RefreshTokenRepository,
  TokenIssuer,
  UserRepository,
} from '../domain/ports.js';
import { RefreshToken } from '../domain/refresh-token.js';
import { toSession, type Session } from './session.js';

export class RefreshSession {
  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenIssuer,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(rawRefreshToken: string): Promise<Session> {
    const now = this.clock.now();
    const current = await this.refreshTokens.findByHash(this.tokens.hashRefresh(rawRefreshToken));

    if (!current) {
      throw new InvalidRefreshToken();
    }

    if (current.isRevoked) {
      await this.refreshTokens.revokeAllForUser(current.userId, now);
      throw new InvalidRefreshToken();
    }

    if (current.isExpired(now)) {
      throw new InvalidRefreshToken();
    }

    const user = await this.users.findById(current.userId);
    if (!user) {
      throw new InvalidRefreshToken();
    }

    await this.refreshTokens.save(current.revoke(now));

    const issued = this.tokens.issueRefresh();
    await this.refreshTokens.save(
      new RefreshToken(this.ids.generate(), user.id, issued.tokenHash, issued.expiresAt, null),
    );

    return toSession(user, this.tokens.issueAccess(user.id), issued.raw);
  }
}
