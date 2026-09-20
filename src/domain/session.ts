export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

export type Session = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type PinRecord = {
  salt: string;
  hash: string;
};
