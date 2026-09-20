import type { Email } from './email.js';

export class User {
  constructor(
    readonly id: string,
    readonly email: Email,
    readonly passwordHash: string,
    readonly createdAt: Date,
    readonly firstName: string = '',
    readonly lastName: string = '',
  ) {}

  withNames(firstName: string, lastName: string): User {
    return new User(this.id, this.email, this.passwordHash, this.createdAt, firstName, lastName);
  }
}
