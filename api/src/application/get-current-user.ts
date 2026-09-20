import { Unauthorized } from '../domain/errors.js';
import type { UserRepository } from '../domain/ports.js';
import { toPublicUser, type PublicUser } from './session.js';

export class GetCurrentUser {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new Unauthorized();
    }
    return toPublicUser(user);
  }
}
