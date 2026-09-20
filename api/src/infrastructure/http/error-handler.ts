import { ZodError } from 'zod';

import { DomainError } from '../../domain/errors.js';

const STATUS_BY_CODE: Record<string, number> = {
  invalid_email: 400,
  weak_password: 400,
  email_already_taken: 409,
  invalid_credentials: 401,
  invalid_refresh_token: 401,
  unauthorized: 401,
  invalid_account: 400,
  account_not_found: 404,
  cannot_delete_last_cash_account: 409,
  account_kind_mismatch: 400,
};

export function mapError(error: unknown): { status: number; body: { error: string } } {
  if (error instanceof ZodError) {
    return { status: 400, body: { error: 'invalid_body' } };
  }
  if (error instanceof DomainError) {
    return {
      status: STATUS_BY_CODE[error.code] ?? 400,
      body: { error: error.code },
    };
  }
  return { status: 500, body: { error: 'internal_error' } };
}
