export type AuthUser = {
  id: string;
  email: string;
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
