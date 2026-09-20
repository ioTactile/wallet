import type { Clock, RefreshTokenRepository, TokenIssuer } from '../domain/ports.js';

export class LogoutUser {
  constructor(
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly tokens: TokenIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(rawRefreshToken: string): Promise<void> {
    const current = await this.refreshTokens.findByHash(this.tokens.hashRefresh(rawRefreshToken));
    if (!current || current.isRevoked) {
      return;
    }
    await this.refreshTokens.save(current.revoke(this.clock.now()));
  }
}
