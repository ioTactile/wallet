import type { User } from '../domain/user.js';

export type PublicUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type Session = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email.value,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export function toSession(user: User, accessToken: string, refreshToken: string): Session {
  return {
    user: toPublicUser(user),
    accessToken,
    refreshToken,
  };
}
