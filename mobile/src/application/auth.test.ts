import { describe, expect, it } from '@jest/globals';

import { AuthApiError } from '@/domain/ports';
import { PinMismatch, WrongPin } from '@/domain/pin';

import { LoginAccount, LogoutAccount, RegisterAccount, UpdateAccountProfile } from './authenticate';
import { CreatePin } from './create-pin';
import { FakeAuthApi, FakePinHasher, InMemoryPinVault, InMemorySessionVault } from './fakes';
import { VerifyPin } from './verify-pin';

describe('local PIN', () => {
  it('stores a hashed PIN and verifies it', async () => {
    const vault = new InMemoryPinVault();
    const hasher = new FakePinHasher();
    await new CreatePin(vault, hasher).execute('1234', '1234');
    await expect(new VerifyPin(vault, hasher).execute('1234')).resolves.toBeUndefined();
    await expect(new VerifyPin(vault, hasher).execute('0000')).rejects.toBeInstanceOf(WrongPin);
  });

  it('rejects a confirmation mismatch before writing', async () => {
    const vault = new InMemoryPinVault();
    await expect(
      new CreatePin(vault, new FakePinHasher()).execute('1234', '4321'),
    ).rejects.toBeInstanceOf(PinMismatch);
    expect(await vault.get()).toBeNull();
  });
});

describe('API session', () => {
  it('registers then logs out', async () => {
    const api = new FakeAuthApi();
    const sessions = new InMemorySessionVault();
    const session = await new RegisterAccount(api, sessions).execute(
      'jordan@example.com',
      'longenough',
    );
    expect(session.user.email).toBe('jordan@example.com');
    expect((await sessions.get())?.refreshToken).toBe('refresh');
    await new LogoutAccount(api, sessions).execute();
    expect(await sessions.get()).toBeNull();
  });

  it('maps a wrong password to invalid_credentials', async () => {
    const api = new FakeAuthApi();
    const sessions = new InMemorySessionVault();
    await new RegisterAccount(api, sessions).execute('jordan@example.com', 'longenough');
    await expect(
      new LoginAccount(api, sessions).execute('jordan@example.com', 'wrongpass'),
    ).rejects.toBeInstanceOf(AuthApiError);
  });

  it('updates first and last name and persists the session', async () => {
    const api = new FakeAuthApi();
    const sessions = new InMemorySessionVault();
    await new RegisterAccount(api, sessions).execute('jordan@example.com', 'longenough');

    const session = await new UpdateAccountProfile(api, sessions).execute('Jordan', 'Dupont');
    expect(session.user).toEqual({
      id: 'user-1',
      email: 'jordan@example.com',
      firstName: 'Jordan',
      lastName: 'Dupont',
    });
    expect(await sessions.get()).toEqual(session);
  });
});
