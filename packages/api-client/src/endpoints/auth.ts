import type { ApiClient } from '../client';
import type { Explorer } from '@travelpoint/types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  explorer: Explorer;
}

export function createAuthEndpoints(client: ApiClient) {
  return {
    register: (body: {
      email: string;
      handle: string;
      password: string;
      acceptTerms: true;
      acceptPrivacy: true;
      inviteCode?: string;
    }) => client.post<{ message: string }>('/api/auth/join', body),

    login: (body: { email: string; password: string }) =>
      client.post<AuthTokens>('/api/auth/login', body),

    refresh: (body: { refreshToken: string }) =>
      client.post<AuthTokens>('/api/auth/refresh', body),

    logout: (body: { refreshToken: string }) =>
      client.post<void>('/api/auth/logout', body),
  };
}
