export class InvalidMoney extends Error {
  constructor(code: 'cents_not_integer' | 'invalid_money' = 'invalid_money') {
    super(code);
    this.name = 'InvalidMoney';
  }
}

function assertIntegerCents(cents: number): void {
  if (!Number.isInteger(cents)) {
    throw new InvalidMoney('cents_not_integer');
  }
}

export function formatMoney(cents: number): string {
  assertIntegerCents(cents);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const euros = Math.trunc(abs / 100);
  const remainder = abs % 100;
  return `${sign}${euros},${String(remainder).padStart(2, '0')} €`;
}

export function formatCompactMoney(cents: number, locale: string): string {
  assertIntegerCents(cents);
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Math.trunc(cents) / 100);
}

const EURO_INPUT = /^-?(\d+)(?:[.,](\d{0,2}))?$/;

export function parseEurosToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (trimmed === '') {
    return null;
  }
  const match = EURO_INPUT.exec(trimmed);
  if (!match) {
    throw new InvalidMoney('invalid_money');
  }
  const whole = Number.parseInt(match[1] ?? '0', 10);
  const fraction = (match[2] ?? '').padEnd(2, '0');
  const cents = whole * 100 + Number.parseInt(fraction || '0', 10);
  return trimmed.startsWith('-') ? -cents : cents;
}

export function centsToInput(cents: number | null): string {
  if (cents == null) {
    return '';
  }
  assertIntegerCents(cents);
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const euros = Math.trunc(abs / 100);
  const remainder = abs % 100;
  return `${sign}${euros},${String(remainder).padStart(2, '0')}`;
}
