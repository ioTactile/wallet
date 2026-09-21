import { FakeBankConnection } from '../application/fake-bank-connection.js';
import type { Env } from '../config/env.js';
import type { BankConnection } from '../domain/bank-connection.js';
import { EnableBankingBankConnection } from './enablebanking-bank-connection.js';
import { GoCardlessBankConnection } from './gocardless-bank-connection.js';

export function createBankConnection(env: Env, fetchImpl: typeof fetch = fetch): BankConnection {
  if (env.BANK_PROVIDER === 'gocardless') {
    const secretId = env.GOCARDLESS_SECRET_ID;
    const secretKey = env.GOCARDLESS_SECRET_KEY;
    if (!secretId || !secretKey) {
      throw new Error('GoCardless secrets are required');
    }
    return new GoCardlessBankConnection({
      publicApiUrl: env.PUBLIC_API_URL,
      secretId,
      secretKey,
      institutionId: env.GOCARDLESS_INSTITUTION_ID,
      fetch: fetchImpl,
    });
  }
  if (env.BANK_PROVIDER === 'enablebanking') {
    const applicationId = env.ENABLEBANKING_APPLICATION_ID;
    const privateKeyPem = env.ENABLEBANKING_PRIVATE_KEY;
    if (!applicationId || !privateKeyPem) {
      throw new Error('Enable Banking credentials are required');
    }
    return new EnableBankingBankConnection({
      publicApiUrl: env.PUBLIC_API_URL,
      applicationId,
      privateKeyPem,
      aspspName: env.ENABLEBANKING_ASPSP_NAME,
      aspspCountry: env.ENABLEBANKING_ASPSP_COUNTRY,
      fetch: fetchImpl,
    });
  }
  return new FakeBankConnection(env.PUBLIC_API_URL);
}
