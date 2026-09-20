import { HttpAccountApi } from '@/infrastructure/account-api';
import { HttpAuthApi } from '@/infrastructure/auth-api';
import { ExpoPinHasher } from '@/infrastructure/expo-pin-hasher';
import { secretStore } from '@/infrastructure/expo-secret-store';
import { SecurePinVault, SecureSessionVault } from '@/infrastructure/secure-vaults';

import {
  ArchiveAccount,
  CreateCashAccount,
  DeleteAccount,
  GetAccount,
  ListAccounts,
  UpdateAccount,
} from './accounts';
import {
  HydrateAuth,
  LoginAccount,
  LogoutAccount,
  RegisterAccount,
  UpdateAccountProfile,
} from './authenticate';
import { CreatePin } from './create-pin';
import { VerifyPin } from './verify-pin';

const pinVault = new SecurePinVault(secretStore);
const sessionVault = new SecureSessionVault(secretStore);
const pinHasher = new ExpoPinHasher();
const authApi = new HttpAuthApi();
const accountApi = new HttpAccountApi(sessionVault, authApi);

export const authUseCases = {
  pinVault,
  sessionVault,
  createPin: new CreatePin(pinVault, pinHasher),
  verifyPin: new VerifyPin(pinVault, pinHasher),
  register: new RegisterAccount(authApi, sessionVault),
  login: new LoginAccount(authApi, sessionVault),
  logout: new LogoutAccount(authApi, sessionVault),
  updateProfile: new UpdateAccountProfile(authApi, sessionVault),
  hydrate: new HydrateAuth(pinVault, sessionVault),
};

export const accountUseCases = {
  list: new ListAccounts(accountApi),
  get: new GetAccount(accountApi),
  createCash: new CreateCashAccount(accountApi),
  update: new UpdateAccount(accountApi),
  archive: new ArchiveAccount(accountApi),
  delete: new DeleteAccount(accountApi),
};
