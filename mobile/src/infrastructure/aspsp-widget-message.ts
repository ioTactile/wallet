export type AspspWidgetMessage =
  | { type: 'wallet.aspspSelected'; name: string; country: string }
  | { type: 'wallet.aspspCancelled' };

export function parseAspspWidgetMessage(raw: string): AspspWidgetMessage | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value == null) {
      return null;
    }
    const record = value as Record<string, unknown>;
    if (record.type === 'wallet.aspspCancelled') {
      return { type: 'wallet.aspspCancelled' };
    }
    if (record.type === 'wallet.aspspSelected') {
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      const country = typeof record.country === 'string' ? record.country.trim() : '';
      if (name.length === 0 || !/^[A-Z]{2}$/.test(country)) {
        return null;
      }
      return { type: 'wallet.aspspSelected', name, country };
    }
    return null;
  } catch {
    return null;
  }
}
