import { describe, expect, it } from '@jest/globals';

import {
  BANK_AUTH_RESULT_KEY,
  bankAuthCallbackConnectionId,
  createBankAuthWaiter,
  notifyBankAuthOpener,
  parseBankAuthSignal,
  parseBankAuthStorage,
  webBankAuthPopupUrl,
  webBankAuthRedirectUri,
} from './bank-auth-popup';

describe('bank auth popup protocol', () => {
  it('reads the connection id only on the AIS callback path', () => {
    expect(
      bankAuthCallbackConnectionId(
        '/bank/callback',
        '?connectionId=4b9b185b-bea0-4f8a-8bab-aedf6500c603',
      ),
    ).toBe('4b9b185b-bea0-4f8a-8bab-aedf6500c603');
    expect(bankAuthCallbackConnectionId('/bank-callback.html', '?connectionId=abc')).toBe('abc');
    expect(bankAuthCallbackConnectionId('/accounts', '?connectionId=abc')).toBeNull();
    expect(bankAuthCallbackConnectionId('/bank/callback', '')).toBeNull();
  });

  it('builds same-origin web popup and redirect URLs', () => {
    expect(webBankAuthRedirectUri('http://localhost:8081/')).toBe(
      'http://localhost:8081/bank-callback.html',
    );
    expect(
      webBankAuthPopupUrl('http://localhost:8081', 'http://127.0.0.1:3000/bank/sandbox/authorize'),
    ).toBe(
      'http://localhost:8081/bank-authorize.html?authorizationUrl=http%3A%2F%2F127.0.0.1%3A3000%2Fbank%2Fsandbox%2Fauthorize',
    );
  });

  it('notifies the original window through storage, broadcast and close', () => {
    const calls: string[] = [];
    const store: Record<string, string> = {};
    const signal = notifyBankAuthOpener({
      connectionId: 'abc',
      store: {
        setItem(key, value) {
          store[key] = value;
        },
      },
      broadcast: (message) => {
        calls.push(`broadcast:${message.connectionId}`);
      },
      postToOpener: (message) => {
        calls.push(`opener:${message.connectionId}`);
      },
      close: () => {
        calls.push('close');
      },
    });
    expect(signal).toEqual({ type: 'wallet.bankAuth', connectionId: 'abc' });
    expect(parseBankAuthStorage(store[BANK_AUTH_RESULT_KEY])).toEqual(signal);
    expect(calls).toEqual(['broadcast:abc', 'opener:abc', 'close']);
  });

  it('resolves success once and ignores a later cancel', () => {
    const results: ('success' | 'cancel')[] = [];
    const waiter = createBankAuthWaiter((result) => results.push(result));
    waiter.onSignal();
    waiter.onCancel();
    expect(results).toEqual(['success']);
  });

  it('cancels only when the user dismisses the wait', () => {
    let result: 'success' | 'cancel' | null = null;
    const waiter = createBankAuthWaiter((value) => {
      result = value;
    });
    waiter.onCancel();
    waiter.onSignal();
    expect(result).toBe('cancel');
  });

  it('rejects unrelated storage payloads', () => {
    expect(parseBankAuthSignal({ type: 'other', connectionId: 'abc' })).toBeNull();
    expect(parseBankAuthStorage('{')).toBeNull();
  });
});
