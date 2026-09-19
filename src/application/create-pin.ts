import { assertPinsMatch } from '@/domain/pin';
import type { PinHasher, PinVault } from '@/domain/ports';

export class CreatePin {
  constructor(
    private readonly vault: PinVault,
    private readonly hasher: PinHasher,
  ) {}

  async execute(pin: string, confirmation: string): Promise<void> {
    assertPinsMatch(pin, confirmation);
    const salt = await this.hasher.generateSalt();
    const hash = await this.hasher.hash(pin, salt);
    await this.vault.save({ salt, hash });
  }
}
