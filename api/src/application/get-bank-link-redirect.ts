import { BankLinkNotFound } from '../domain/errors.js';
import type { BankLinkRepository } from '../domain/ports.js';

export class GetBankLinkRedirect {
  constructor(private readonly links: BankLinkRepository) {}

  async execute(connectionId: string): Promise<{ id: string; redirectUri: string }> {
    const link = await this.links.getById(connectionId);
    if (!link || link.status === 'revoked') {
      throw new BankLinkNotFound();
    }
    return { id: link.id, redirectUri: link.redirectUri };
  }
}
