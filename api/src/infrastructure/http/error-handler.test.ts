import { errorCodes } from 'fastify';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import {
  CannotDeleteAccountWithRecords,
  CannotDeleteAisRecord,
  CannotDeleteLastCashAccount,
} from '../../domain/errors.js';
import { mapError } from './error-handler.js';

describe('mapError', () => {
  it('maps domain and validation errors', () => {
    expect(mapError(new CannotDeleteLastCashAccount())).toEqual({
      status: 409,
      body: { error: 'cannot_delete_last_cash_account' },
    });
    expect(mapError(new CannotDeleteAccountWithRecords())).toEqual({
      status: 409,
      body: { error: 'cannot_delete_account_with_records' },
    });
    expect(mapError(new CannotDeleteAisRecord())).toEqual({
      status: 409,
      body: { error: 'cannot_delete_ais_record' },
    });
    expect(mapError(new ZodError([]))).toEqual({ status: 400, body: { error: 'invalid_body' } });
  });

  it('maps Fastify empty JSON bodies to 400 instead of 500', () => {
    expect(mapError(new errorCodes.FST_ERR_CTP_EMPTY_JSON_BODY())).toEqual({
      status: 400,
      body: { error: 'invalid_body' },
    });
  });

  it('hides unknown failures', () => {
    expect(mapError(new Error('boom'))).toEqual({ status: 500, body: { error: 'internal_error' } });
  });
});
