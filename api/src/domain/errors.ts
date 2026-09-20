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
