import { HttpAuthApi } from '@/infrastructure/auth-api';
import { ExpoPinHasher } from '@/infrastructure/expo-pin-hasher';
import { secretStore } from '@/infrastructure/expo-secret-store';
import { SecurePinVault, SecureSessionVault } from '@/infrastructure/secure-vaults';

import { HydrateAuth, LoginAccount, LogoutAccount, RegisterAccount } from './authenticate';
import { CreatePin } from './create-pin';
import { VerifyPin } from './verify-pin';

const pinVault = new SecurePinVault(secretStore);
const sessionVault = new SecureSessionVault(secretStore);
const pinHasher = new ExpoPinHasher();
const authApi = new HttpAuthApi();

export const authUseCases = {
  pinVault,
  sessionVault,
  createPin: new CreatePin(pinVault, pinHasher),
  verifyPin: new VerifyPin(pinVault, pinHasher),
  register: new RegisterAccount(authApi, sessionVault),
  login: new LoginAccount(authApi, sessionVault),
  logout: new LogoutAccount(authApi, sessionVault),
  hydrate: new HydrateAuth(pinVault, sessionVault),
};
