import { describe, expect, it } from '@jest/globals';

import { centsToInput, formatMoney, parseEurosToCents } from '@/domain/money';

describe('formatMoney', () => {
  it('formats integer cents as a French euro label without floats', () => {
    expect(formatMoney(0)).toBe('0,00 €');
    expect(formatMoney(199)).toBe('1,99 €');
    expect(formatMoney(100)).toBe('1,00 €');
    expect(formatMoney(-150)).toBe('-1,50 €');
  });

  it('rejects a non-integer amount', () => {
    expect(() => formatMoney(1.5)).toThrow('cents_not_integer');
  });
});

describe('parseEurosToCents', () => {
  it('parses an empty string as null', () => {
    expect(parseEurosToCents('')).toBeNull();
    expect(parseEurosToCents('   ')).toBeNull();
  });

  it('parses euro strings into integer cents', () => {
    expect(parseEurosToCents('0')).toBe(0);
    expect(parseEurosToCents('1,99')).toBe(199);
    expect(parseEurosToCents('1.5')).toBe(150);
    expect(parseEurosToCents('-1,50')).toBe(-150);
    expect(parseEurosToCents(' 12 ')).toBe(1200);
  });

  it('rejects invalid euro strings', () => {
    expect(() => parseEurosToCents('abc')).toThrow('invalid_money');
    expect(() => parseEurosToCents('1,999')).toThrow('invalid_money');
  });
});

describe('centsToInput', () => {
  it('renders a nullable cents value as an editable euro string', () => {
    expect(centsToInput(null)).toBe('');
    expect(centsToInput(0)).toBe('0,00');
    expect(centsToInput(150)).toBe('1,50');
  });
});
