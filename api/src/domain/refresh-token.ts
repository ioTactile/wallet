export class RefreshToken {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly tokenHash: string,
    readonly expiresAt: Date,
    readonly revokedAt: Date | null,
  ) {}

  get isRevoked(): boolean {
    return this.revokedAt !== null;
  }

  isExpired(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  revoke(now: Date): RefreshToken {
    return new RefreshToken(this.id, this.userId, this.tokenHash, this.expiresAt, now);
  }
}

export type IssuedRefresh = {
  raw: string;
  tokenHash: string;
  expiresAt: Date;
};
