import { describe, expect, it } from '@jest/globals';

import { parseAspspWidgetMessage } from './aspsp-widget-message';

describe('parseAspspWidgetMessage', () => {
  it('parses a selected ASPSP', () => {
    expect(
      parseAspspWidgetMessage(
        JSON.stringify({ type: 'wallet.aspspSelected', name: '  CIC ', country: 'FR' }),
      ),
    ).toEqual({ type: 'wallet.aspspSelected', name: 'CIC', country: 'FR' });
  });

  it('parses cancel and rejects invalid payloads', () => {
    expect(parseAspspWidgetMessage(JSON.stringify({ type: 'wallet.aspspCancelled' }))).toEqual({
      type: 'wallet.aspspCancelled',
    });
    expect(
      parseAspspWidgetMessage(
        JSON.stringify({ type: 'wallet.aspspSelected', name: 'CIC', country: 'fr' }),
      ),
    ).toBeNull();
    expect(parseAspspWidgetMessage('{')).toBeNull();
  });
});
