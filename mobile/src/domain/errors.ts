export class AuthApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'AuthApiError';
  }
}

export class AccountApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'AccountApiError';
  }
}

export class RecordApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'RecordApiError';
  }
}

export class BankApiError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'BankApiError';
  }
}
