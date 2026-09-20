import {
  loginBodySchema,
  logoutBodySchema,
  refreshBodySchema,
  registerBodySchema,
  updateProfileBodySchema,
} from '@wallet/shared';
import type { FastifyInstance } from 'fastify';

import type { GetCurrentUser } from '../../application/get-current-user.js';
import type { LoginUser } from '../../application/login-user.js';
import type { LogoutUser } from '../../application/logout-user.js';
import type { RefreshSession } from '../../application/refresh-session.js';
import type { RegisterUser } from '../../application/register-user.js';
import type { UpdateProfile } from '../../application/update-profile.js';
import type { Env } from '../../config/env.js';

export type AuthRoutesDeps = {
  env: Env;
  registerUser: RegisterUser;
  loginUser: LoginUser;
  refreshSession: RefreshSession;
  logoutUser: LogoutUser;
  getCurrentUser: GetCurrentUser;
  updateProfile: UpdateProfile;
};

export async function registerAuthRoutes(app: FastifyInstance, deps: AuthRoutesDeps) {
  const authLimit = { config: { rateLimit: { max: deps.env.AUTH_RATE_LIMIT_MAX } } };

  app.post('/auth/register', authLimit, async (request, reply) => {
    const body = registerBodySchema.parse(request.body);
    const session = await deps.registerUser.execute(body);
    return reply.code(201).send(session);
  });

  app.post('/auth/login', authLimit, async (request, reply) => {
    const body = loginBodySchema.parse(request.body);
    const session = await deps.loginUser.execute(body);
    return reply.send(session);
  });

  app.post('/auth/refresh', async (request, reply) => {
    const body = refreshBodySchema.parse(request.body);
    const session = await deps.refreshSession.execute(body.refreshToken);
    return reply.send(session);
  });

  app.post('/auth/logout', async (request, reply) => {
    const body = logoutBodySchema.parse(request.body);
    await deps.logoutUser.execute(body.refreshToken);
    return reply.code(204).send();
  });

  app.get('/me', { onRequest: [app.authenticate] }, async (request) =>
    deps.getCurrentUser.execute(request.user.sub),
  );

  app.patch('/me', { onRequest: [app.authenticate] }, async (request) => {
    const body = updateProfileBodySchema.parse(request.body);
    return deps.updateProfile.execute(request.user.sub, body);
  });
}
