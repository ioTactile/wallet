import { parsePin, WrongPin } from '@/domain/pin';
import type { PinHasher, PinVault } from '@/domain/ports';

export class VerifyPin {
  constructor(
    private readonly vault: PinVault,
    private readonly hasher: PinHasher,
  ) {}

  async execute(pin: string): Promise<void> {
    const parsed = parsePin(pin);
    const record = await this.vault.get();
    if (!record) {
      throw new WrongPin();
    }
    const hash = await this.hasher.hash(parsed, record.salt);
    if (hash !== record.hash) {
      throw new WrongPin();
    }
  }
}
