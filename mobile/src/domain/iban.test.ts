import { describe, expect, it } from '@jest/globals';

import { maskIban } from './iban';

describe('maskIban', () => {
  it('keeps the first 4 and last 4 characters of a compact IBAN', () => {
    expect(maskIban('FR7630001007941234567890185')).toBe('FR76 •••• 0185');
  });

  it('strips spaces before masking', () => {
    expect(maskIban('FR76 3000 1007 9412 3456 7890 185')).toBe('FR76 •••• 0185');
  });

  it('returns the compact value when it is too short to mask', () => {
    expect(maskIban('FR76')).toBe('FR76');
    expect(maskIban('')).toBe('');
  });
});
