import { tokenStorage } from './secureStorage';

export const API_BASE_URL = (
  process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000'
).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  if (isRefreshing) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refresh = await tokenStorage.getRefreshToken();
      if (!refresh) return null;

      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });

      if (!res.ok) {
        await tokenStorage.clear();
        return null;
      }

      const data = await res.json() as { accessToken: string; refreshToken: string };
      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
      return data.accessToken;
    } catch {
      await tokenStorage.clear();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = await tokenStorage.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      `Nie można połączyć się z API (${API_BASE_URL}). Sprawdź, czy backend jest wdrożony i dostępny z telefonu.`,
      0,
    );
  }

  if (res.status === 401 && retry) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
    // Refresh failed — throw so AuthGate can redirect to login
    throw new ApiError('UNAUTHORIZED', 'Session expired', 401);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: 'UNKNOWN', message: res.statusText })) as { code: string; message: string };
    throw new ApiError(err.code, err.message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
