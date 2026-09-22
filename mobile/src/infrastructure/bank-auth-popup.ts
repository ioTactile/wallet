export const BANK_AUTH_POPUP_NAME = 'wallet-bank-auth';
export const BANK_AUTH_RESULT_KEY = 'wallet.bankAuth.complete';
export const BANK_AUTH_CHANNEL = 'wallet.bankAuth';

export type BankAuthSignal = { type: 'wallet.bankAuth'; connectionId: string };

export function bankAuthCallbackConnectionId(pathname: string, search: string): string | null {
  const path = pathname.replace(/\/+$/, '');
  const isCallback = path.endsWith('/bank/callback') || path.endsWith('/bank-callback.html');
  if (!isCallback) {
    return null;
  }
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const raw = params.get('connectionId') ?? params.get('ref');
  if (raw == null) {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function webBankAuthRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, '')}/bank-callback.html`;
}

export function webBankAuthPopupUrl(_origin: string, authorizationUrl: string): string {
  if (!/^https?:\/\//i.test(authorizationUrl)) {
    throw new Error('Invalid bank authorization URL');
  }
  // Open AIS top-level: Enable Banking (and real banks) set X-Frame-Options / frame-ancestors.
  return authorizationUrl;
}

export function parseBankAuthSignal(value: unknown): BankAuthSignal | null {
  if (typeof value !== 'object' || value == null) {
    return null;
  }
  const record = value as { type?: unknown; connectionId?: unknown };
  if (record.type !== 'wallet.bankAuth' || typeof record.connectionId !== 'string') {
    return null;
  }
  const connectionId = record.connectionId.trim();
  return connectionId.length === 0 ? null : { type: 'wallet.bankAuth', connectionId };
}

export function parseBankAuthStorage(raw: string | null): BankAuthSignal | null {
  if (raw == null) {
    return null;
  }
  try {
    return parseBankAuthSignal(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function notifyBankAuthOpener(deps: {
  connectionId: string;
  store: { setItem: (key: string, value: string) => void };
  broadcast: (signal: BankAuthSignal) => void;
  postToOpener: (signal: BankAuthSignal) => void;
  close: () => void;
}): BankAuthSignal {
  const signal: BankAuthSignal = { type: 'wallet.bankAuth', connectionId: deps.connectionId };
  deps.store.setItem(BANK_AUTH_RESULT_KEY, JSON.stringify(signal));
  deps.broadcast(signal);
  deps.postToOpener(signal);
  deps.close();
  return signal;
}

export function createBankAuthWaiter(resolve: (result: 'success' | 'cancel') => void): {
  onSignal: () => void;
  onCancel: () => void;
} {
  let settled = false;
  const finish = (result: 'success' | 'cancel') => {
    if (settled) {
      return;
    }
    settled = true;
    resolve(result);
  };
  return {
    onSignal: () => finish('success'),
    onCancel: () => finish('cancel'),
  };
}

export function isTrustedBankAuthMessage(
  event: Pick<MessageEvent, 'origin' | 'data'>,
  expectedOrigin: string,
): boolean {
  return event.origin === expectedOrigin && parseBankAuthSignal(event.data) != null;
}
