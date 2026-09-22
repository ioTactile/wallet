import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import type { BankAuthSession } from '@/domain/ports';

import {
  BANK_AUTH_CHANNEL,
  BANK_AUTH_POPUP_NAME,
  BANK_AUTH_RESULT_KEY,
  bankAuthCallbackConnectionId,
  createBankAuthWaiter,
  isTrustedBankAuthMessage,
  notifyBankAuthOpener,
  parseBankAuthSignal,
  parseBankAuthStorage,
  webBankAuthPopupUrl,
  webBankAuthRedirectUri,
} from './bank-auth-popup';

let dismissActiveWebBankAuth: (() => void) | null = null;

export function dismissWebBankAuth(): void {
  dismissActiveWebBankAuth?.();
}

export function notifyBankAuthFromWindow(): boolean {
  if (typeof window === 'undefined' || Platform.OS !== 'web') {
    return false;
  }
  const connectionId = bankAuthCallbackConnectionId(
    window.location.pathname,
    window.location.search,
  );
  if (connectionId == null) {
    return false;
  }
  try {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(BANK_AUTH_CHANNEL) : null;
    notifyBankAuthOpener({
      connectionId,
      store: window.localStorage,
      broadcast: (signal) => {
        channel?.postMessage(signal);
        channel?.close();
      },
      postToOpener: (signal) => {
        window.opener?.postMessage(signal, window.location.origin);
      },
      close: () => {
        window.close();
      },
    });
  } catch {
    return false;
  }
  return true;
}

export class ExpoBankAuthSession implements BankAuthSession {
  redirectUri(): string {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return webBankAuthRedirectUri(window.location.origin);
    }
    return Linking.createURL('bank/callback');
  }

  async open(authorizationUrl: string, redirectUri: string): Promise<'success' | 'cancel'> {
    if (Platform.OS === 'web') {
      return openWebBankAuthPopup(authorizationUrl);
    }
    const result = await WebBrowser.openAuthSessionAsync(authorizationUrl, redirectUri);
    return result.type === 'success' ? 'success' : 'cancel';
  }
}

function openWebBankAuthPopup(authorizationUrl: string): Promise<'success' | 'cancel'> {
  window.localStorage.removeItem(BANK_AUTH_RESULT_KEY);
  const popup = window.open(
    webBankAuthPopupUrl(window.location.origin, authorizationUrl),
    BANK_AUTH_POPUP_NAME,
    'width=500,height=650,scrollbars=yes,resizable=yes',
  );
  if (popup == null) {
    return Promise.resolve('cancel');
  }
  try {
    popup.opener = null;
  } catch {
    // Some browsers block assigning opener; channels below still work.
  }
  try {
    popup.focus();
  } catch {
    // Some browsers block focus on the popup; the session can still complete.
  }

  const expectedOrigin = window.location.origin;
  return new Promise((resolve) => {
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(BANK_AUTH_CHANNEL) : null;
    const waiter = createBankAuthWaiter((result) => {
      dismissActiveWebBankAuth = null;
      channel?.removeEventListener('message', onChannel);
      channel?.close();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('message', onMessage);
      window.clearInterval(interval);
      window.localStorage.removeItem(BANK_AUTH_RESULT_KEY);
      try {
        popup.close();
      } catch {
        // The popup may already be closed by the callback page.
      }
      resolve(result);
    });
    dismissActiveWebBankAuth = () => waiter.onCancel();

    const onChannel = (event: MessageEvent) => {
      if (parseBankAuthSignal(event.data)) {
        waiter.onSignal();
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === BANK_AUTH_RESULT_KEY && parseBankAuthStorage(event.newValue)) {
        waiter.onSignal();
      }
    };
    const onMessage = (event: MessageEvent) => {
      if (isTrustedBankAuthMessage(event, expectedOrigin)) {
        waiter.onSignal();
      }
    };

    channel?.addEventListener('message', onChannel);
    window.addEventListener('storage', onStorage);
    window.addEventListener('message', onMessage);
    const interval = window.setInterval(() => {
      if (parseBankAuthStorage(window.localStorage.getItem(BANK_AUTH_RESULT_KEY))) {
        waiter.onSignal();
      }
    }, 100);
  });
}
