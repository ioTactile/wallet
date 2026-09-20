import { Unauthorized } from '../domain/errors.js';
import type { UserRepository } from '../domain/ports.js';
import { toPublicUser, type PublicUser } from './session.js';

export class UpdateProfile {
  constructor(private readonly users: UserRepository) {}

  async execute(
    userId: string,
    input: { firstName: string; lastName: string },
  ): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new Unauthorized();
    }

    const updated = user.withNames(input.firstName, input.lastName);
    await this.users.save(updated);
    return toPublicUser(updated);
  }
}
