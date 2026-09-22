import { BankLinkNotFound } from '../domain/errors.js';
import type { BankConnection } from '../domain/bank-connection.js';
import type { BankLinkRepository, Clock } from '../domain/ports.js';

export class FinalizeBankAuthorization {
  constructor(
    private readonly links: BankLinkRepository,
    private readonly bank: BankConnection,
    private readonly clock: Clock,
  ) {}

  async execute(connectionId: string, code: string | undefined): Promise<void> {
    const link = await this.links.getById(connectionId);
    if (!link) {
      throw new BankLinkNotFound();
    }
    if (link.status === 'revoked') {
      throw new BankLinkNotFound();
    }
    const providerConnectionId = await this.bank.finalizeConsent({
      code,
      providerConnectionId: link.providerConnectionId,
    });
    const bound = link.bindProviderConnection(providerConnectionId, this.clock.now());
    if (bound !== link) {
      await this.links.save(bound);
    }
  }
}
