import { authUserSchema, sessionResponseSchema } from '@wallet/shared';

import { AuthApiError } from '@/domain/errors';
import type { AuthApi } from '@/domain/ports';
import type { Session } from '@/domain/session';

function baseUrl() {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_API_URL is not defined');
  }
  return url.replace(/\/$/, '');
}

async function parseError(response: Response): Promise<AuthApiError> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return new AuthApiError(body.error ?? 'generic_error');
}

async function request(path: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  return response;
}

function toSession(payload: unknown): Session {
  return sessionResponseSchema.parse(payload);
}

function toAuthUser(payload: unknown): Session['user'] {
  return authUserSchema.parse(payload);
}

export class HttpAuthApi implements AuthApi {
  async register(email: string, password: string): Promise<Session> {
    const response = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw await parseError(response);
    }
    return toSession(await response.json());
  }

  async login(email: string, password: string): Promise<Session> {
    const response = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw await parseError(response);
    }
    return toSession(await response.json());
  }

  async refresh(refreshToken: string): Promise<Session> {
    const response = await request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      throw await parseError(response);
    }
    return toSession(await response.json());
  }

  async logout(refreshToken: string): Promise<void> {
    const response = await request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok && response.status !== 204) {
      throw await parseError(response);
    }
  }

  async me(accessToken: string): Promise<Session['user']> {
    const response = await request('/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw await parseError(response);
    }
    return toAuthUser(await response.json());
  }

  async updateProfile(
    accessToken: string,
    profile: { firstName: string; lastName: string },
  ): Promise<Session['user']> {
    const response = await request('/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(profile),
    });
    if (!response.ok) {
      throw await parseError(response);
    }
    return toAuthUser(await response.json());
  }
}
