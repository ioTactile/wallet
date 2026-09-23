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

export class InvalidRecord extends DomainError {
  constructor(message = 'Invalid record') {
    super('invalid_record', message);
  }
}

export class RecordNotFound extends DomainError {
  constructor() {
    super('record_not_found', 'Record not found');
  }
}

export class ManualRecordOnBank extends DomainError {
  constructor() {
    super('manual_record_on_bank', 'Manual expense and income are only allowed on cash accounts');
  }
}

export class CannotDeleteAccountWithRecords extends DomainError {
  constructor() {
    super('cannot_delete_account_with_records', 'Cannot delete an account that has records');
  }
}

export class InvalidBankLink extends DomainError {
  constructor(message = 'Invalid bank link') {
    super('invalid_bank_link', message);
  }
}

export class BankLinkNotFound extends DomainError {
  constructor() {
    super('bank_link_not_found', 'Bank link not found');
  }
}

export class BankLinkNotCompletable extends DomainError {
  constructor() {
    super('bank_link_not_completable', 'Bank link cannot be completed');
  }
}

export class CannotSyncAccount extends DomainError {
  constructor(message = 'Cannot sync this account') {
    super('cannot_sync_account', message);
  }
}

export class CannotMutateAisRecord extends DomainError {
  constructor() {
    super(
      'cannot_mutate_ais_record',
      'Bank-imported records cannot change amount, date or account',
    );
  }
}

export class CannotDeleteAisRecord extends DomainError {
  constructor() {
    super('cannot_delete_ais_record', 'Bank-imported records cannot be deleted');
  }
}

export class CannotDisconnectAccount extends DomainError {
  constructor() {
    super('cannot_disconnect_account', 'Only bank accounts can be disconnected');
  }
}

export class AspspRequired extends DomainError {
  constructor() {
    super('aspsp_required', 'ASPSP selection is required for Enable Banking');
  }
}
