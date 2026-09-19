import { describe, expect, it } from '@jest/globals';

import { InvalidPin, PinMismatch, assertPinsMatch, parsePin } from './pin';

describe('PIN', () => {
  it('accepts exactly 4 digits', () => {
    expect(parsePin('1234')).toBe('1234');
  });

  it('rejects a short or non-numeric PIN', () => {
    expect(() => parsePin('123')).toThrow(InvalidPin);
    expect(() => parsePin('123a')).toThrow(InvalidPin);
  });

  it('requires confirmation to match', () => {
    expect(() => assertPinsMatch('1234', '4321')).toThrow(PinMismatch);
    expect(() => assertPinsMatch('1234', '1234')).not.toThrow();
  });
});
