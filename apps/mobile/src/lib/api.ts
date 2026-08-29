import { supabase } from './supabase';

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

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      `Nie można połączyć się z API (${API_BASE_URL}). Sprawdź, czy backend jest dostępny z telefonu.`,
      0,
    );
  }

  if (res.status === 401 && retry) {
    // Spróbuj odświeżyć sesję Supabase i ponów żądanie
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      return request<T>(path, options, false);
    }
    // Refresh nie powiódł się — wyloguj
    await supabase.auth.signOut();
    throw new ApiError('UNAUTHORIZED', 'Sesja wygasła. Zaloguj się ponownie.', 401);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ code: 'UNKNOWN', message: res.statusText })) as {
      code: string;
      message: string;
    };
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
