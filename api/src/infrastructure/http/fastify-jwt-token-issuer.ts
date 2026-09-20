import { createHash, randomBytes } from 'node:crypto';

import type { Clock, TokenIssuer } from '../../domain/ports.js';
import type { IssuedRefresh } from '../../domain/refresh-token.js';

type JwtSigner = {
  sign(payload: object): string;
};

export class FastifyJwtTokenIssuer implements TokenIssuer {
  constructor(
    private readonly jwt: JwtSigner,
    private readonly clock: Clock,
    private readonly refreshTtlMs: number,
  ) {}

  issueAccess(userId: string): string {
    return this.jwt.sign({ sub: userId });
  }

  issueRefresh(): IssuedRefresh {
    const raw = randomBytes(32).toString('hex');
    return {
      raw,
      tokenHash: this.hashRefresh(raw),
      expiresAt: new Date(this.clock.now().getTime() + this.refreshTtlMs),
    };
  }

  hashRefresh(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
