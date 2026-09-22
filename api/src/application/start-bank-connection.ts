import { BankLink } from '../domain/bank-link.js';
import type { BankConnection } from '../domain/bank-connection.js';
import type { BankLinkRepository, Clock, IdGenerator } from '../domain/ports.js';

export type StartBankConnectionResult = {
  id: string;
  authorizationUrl: string;
};

export class StartBankConnection {
  constructor(
    private readonly links: BankLinkRepository,
    private readonly bank: BankConnection,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(userId: string, redirectUri: string): Promise<StartBankConnectionResult> {
    const id = this.ids.generate();
    const consent = await this.bank.startConsent({
      userId,
      redirectUri,
      state: id,
    });
    const link = BankLink.start({
      id,
      userId,
      provider: this.bank.provider,
      providerConnectionId: consent.providerConnectionId,
      redirectUri,
      now: this.clock.now(),
    });
    await this.links.save(link);
    return { id: link.id, authorizationUrl: consent.authorizationUrl };
  }
}
