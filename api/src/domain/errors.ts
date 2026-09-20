export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class InvalidEmail extends DomainError {
  constructor() {
    super('invalid_email', 'Invalid email');
  }
}

export class WeakPassword extends DomainError {
  constructor() {
    super('weak_password', 'Password must be between 8 and 128 characters');
  }
}

export class EmailAlreadyTaken extends DomainError {
  constructor() {
    super('email_already_taken', 'Email already taken');
  }
}

export class InvalidCredentials extends DomainError {
  constructor() {
    super('invalid_credentials', 'Invalid credentials');
  }
}

export class InvalidRefreshToken extends DomainError {
  constructor() {
    super('invalid_refresh_token', 'Invalid refresh token');
  }
}

export class Unauthorized extends DomainError {
  constructor() {
    super('unauthorized', 'Unauthorized');
  }
}

export class InvalidAccount extends DomainError {
  constructor(message = 'Invalid account') {
    super('invalid_account', message);
  }
}

export class AccountNotFound extends DomainError {
  constructor() {
    super('account_not_found', 'Account not found');
  }
}

export class CannotDeleteLastCashAccount extends DomainError {
  constructor() {
    super('cannot_delete_last_cash_account', 'Cannot delete the last cash account');
  }
}

export class AccountKindMismatch extends DomainError {
  constructor() {
    super('account_kind_mismatch', 'Account kind mismatch');
  }
}
