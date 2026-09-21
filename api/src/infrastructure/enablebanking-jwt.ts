import { createPrivateKey, createSign } from 'node:crypto';

const JWT_TTL_SECONDS = 3600;

export function normalizePem(raw: string): string {
  return raw.includes('\\n') ? raw.replaceAll('\\n', '\n') : raw;
}

export function signEnableBankingJwt(input: {
  applicationId: string;
  privateKeyPem: string;
  now?: Date;
}): string {
  const issuedAt = Math.floor((input.now ?? new Date()).getTime() / 1000);
  const header = { typ: 'JWT', alg: 'RS256', kid: input.applicationId };
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: issuedAt,
    exp: issuedAt + JWT_TTL_SECONDS,
  };
  const unsigned = `${base64Url(header)}.${base64Url(payload)}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(createPrivateKey(normalizePem(input.privateKeyPem)), 'base64url');
  return `${unsigned}.${signature}`;
}

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
