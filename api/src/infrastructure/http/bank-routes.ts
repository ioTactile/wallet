import {
  enableBankingReturnQuerySchema,
  gocardlessReturnQuerySchema,
  sandboxAuthorizeQuerySchema,
  startBankConnectionBodySchema,
  startBankConnectionResponseSchema,
} from '@wallet/shared';
import type { FastifyInstance } from 'fastify';

import type { CompleteBankConnection } from '../../application/complete-bank-connection.js';
import type { FinalizeBankAuthorization } from '../../application/finalize-bank-authorization.js';
import type { GetAccountBalances } from '../../application/get-account-balances.js';
import type { StartBankConnection } from '../../application/start-bank-connection.js';
import type { BankLinkRepository } from '../../domain/ports.js';
import { decodeEnableBankingState } from '../enablebanking-mapper.js';
import { presentAccounts } from './account-routes.js';

export type BankRoutesDeps = {
  startBankConnection: StartBankConnection;
  completeBankConnection: CompleteBankConnection;
  finalizeBankAuthorization: FinalizeBankAuthorization;
  getAccountBalances: GetAccountBalances;
  bankLinks: BankLinkRepository;
  enableBankingStateSecret: string;
};

export async function registerBankRoutes(app: FastifyInstance, deps: BankRoutesDeps) {
  app.post('/bank/connections', { onRequest: [app.authenticate] }, async (request, reply) => {
    const body = startBankConnectionBodySchema.parse(request.body);
    const started = await deps.startBankConnection.execute(request.user.sub, body.redirectUri);
    return reply.code(201).send(startBankConnectionResponseSchema.parse(started));
  });

  app.post('/bank/connections/:id/complete', { onRequest: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const accounts = await deps.completeBankConnection.execute(request.user.sub, id);
    const balances = await deps.getAccountBalances.execute(request.user.sub);
    return presentAccounts(accounts, balances);
  });

  app.get('/bank/sandbox/authorize', async (request, reply) => {
    const query = sandboxAuthorizeQuerySchema.parse(request.query);
    const link = await deps.bankLinks.getById(query.connectionId);
    if (!link || link.status === 'revoked') {
      return reply.code(404).send({ error: 'bank_link_not_found' });
    }
    const href = buildRedirectHref(link.redirectUri, link.id);
    reply.removeHeader('x-frame-options');
    reply.header('content-security-policy', 'frame-ancestors *');
    return reply.type('text/html; charset=utf-8').send(sandboxAuthorizePage(href));
  });

  app.get('/bank/gocardless/return', async (request, reply) => {
    const query = gocardlessReturnQuerySchema.parse(request.query);
    const link = await deps.bankLinks.getById(query.connectionId);
    if (!link || link.status === 'revoked') {
      return reply.code(404).send({ error: 'bank_link_not_found' });
    }
    return reply.redirect(buildRedirectHref(link.redirectUri, link.id));
  });

  app.get('/bank/enablebanking/return', async (request, reply) => {
    const query = enableBankingReturnQuerySchema.parse(request.query);
    let connectionId: string;
    try {
      connectionId = decodeEnableBankingState(
        query.state,
        deps.enableBankingStateSecret,
      ).connectionId;
    } catch {
      return reply.code(400).send({ error: 'invalid_body' });
    }
    const link = await deps.bankLinks.getById(connectionId);
    if (!link || link.status === 'revoked') {
      return reply.code(404).send({ error: 'bank_link_not_found' });
    }
    if (query.code != null && query.error == null) {
      await deps.finalizeBankAuthorization.execute(link.id, query.code);
    }
    return reply.redirect(buildRedirectHref(link.redirectUri, link.id));
  });
}

function buildRedirectHref(redirectUri: string, connectionId: string): string {
  const separator = redirectUri.includes('?') ? '&' : '?';
  return `${redirectUri}${separator}connectionId=${encodeURIComponent(connectionId)}`;
}

function sandboxAuthorizePage(href: string): string {
  const safeHref = escapeHtml(href);
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Banque démo</title>
  </head>
  <body>
    <h1>Banque démo</h1>
    <p>Connexion AIS en lecture seule. Aucune écriture n’est envoyée à une banque réelle.</p>
    <p><a href="${safeHref}" target="_top">Connecter la banque démo</a></p>
  </body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
