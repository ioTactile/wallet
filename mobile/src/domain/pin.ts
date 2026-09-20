export const PIN_LENGTH = 4;

export class InvalidPin extends Error {
  constructor() {
    super('invalid_pin');
    this.name = 'InvalidPin';
  }
}

export class PinMismatch extends Error {
  constructor() {
    super('pin_mismatch');
    this.name = 'PinMismatch';
  }
}

export class WrongPin extends Error {
  constructor() {
    super('wrong_pin');
    this.name = 'WrongPin';
  }
}

export function parsePin(raw: string): string {
  if (!new RegExp(`^\\d{${PIN_LENGTH}}$`).test(raw)) {
    throw new InvalidPin();
  }
  return raw;
}

export function assertPinsMatch(pin: string, confirmation: string): void {
  if (parsePin(pin) !== parsePin(confirmation)) {
    throw new PinMismatch();
  }
}
