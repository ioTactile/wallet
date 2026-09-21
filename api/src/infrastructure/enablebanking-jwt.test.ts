import { createVerify, generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { signEnableBankingJwt } from './enablebanking-jwt.js';

describe('signEnableBankingJwt', () => {
  it('signs an RS256 JWT with the application id as kid', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const now = new Date('2026-09-21T10:00:00.000Z');
    const token = signEnableBankingJwt({
      applicationId: 'app-123',
      privateKeyPem: pem.replaceAll('\n', '\\n'),
      now,
    });
    const [headerPart, payloadPart, signature] = token.split('.');
    expect(JSON.parse(Buffer.from(headerPart ?? '', 'base64url').toString())).toEqual({
      typ: 'JWT',
      alg: 'RS256',
      kid: 'app-123',
    });
    const issuedAt = Math.floor(now.getTime() / 1000);
    expect(JSON.parse(Buffer.from(payloadPart ?? '', 'base64url').toString())).toEqual({
      iss: 'enablebanking.com',
      aud: 'api.enablebanking.com',
      iat: issuedAt,
      exp: issuedAt + 3600,
    });
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${headerPart}.${payloadPart}`);
    expect(verifier.verify(publicKey, signature ?? '', 'base64url')).toBe(true);
  });
});
