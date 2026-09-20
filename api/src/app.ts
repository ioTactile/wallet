import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';

import type { AccountRoutesDeps } from './infrastructure/http/account-routes.js';
import { registerAccountRoutes } from './infrastructure/http/account-routes.js';
import type { AuthRoutesDeps } from './infrastructure/http/auth-routes.js';
import { registerAuthRoutes } from './infrastructure/http/auth-routes.js';
import { mapError } from './infrastructure/http/error-handler.js';
import type { Env } from './config/env.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export async function createServer(env: Env): Promise<FastifyInstance> {
  const app = Fastify({ logger: env.NODE_ENV !== 'test' });
  const parseJson = app.getDefaultJsonParser('error', 'error');
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const json = typeof body === 'string' ? body : body.toString();
    if (json.length === 0) {
      done(null, null);
      return;
    }
    parseJson(request, json, done);
  });

  await app.register(helmet, {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: '1 minute',
  });
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_EXPIRES },
  });

  app.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.setErrorHandler((error, request, reply) => {
    const mapped = mapError(error);
    if (mapped.status === 500) {
      request.log.error(error);
    }
    return reply.code(mapped.status).send(mapped.body);
  });

  app.get('/health', async () => ({ status: 'ok' }));
  return app;
}

export type ApiDeps = AuthRoutesDeps & AccountRoutesDeps;

export async function registerApi(app: FastifyInstance, deps: ApiDeps): Promise<void> {
  await registerAuthRoutes(app, deps);
  await registerAccountRoutes(app, deps);
}
