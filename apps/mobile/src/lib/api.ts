import { supabase } from './supabase';
import { enqueueOfflineMutation } from '../stores/offlineQueue';

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

type MutationMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function mutation<T>(
  method: MutationMethod,
  path: string,
  body?: unknown,
  queue = true,
): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) init.body = JSON.stringify(body);
  try {
    return await request<T>(path, init);
  } catch (err) {
    if (queue && err instanceof ApiError && err.code === 'NETWORK_ERROR') {
      void enqueueOfflineMutation(method, path, body);
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, queue?: boolean) =>
    mutation<T>('POST', path, body, queue),
  put: <T>(path: string, body: unknown, queue?: boolean) =>
    mutation<T>('PUT', path, body, queue),
  patch: <T>(path: string, body: unknown, queue?: boolean) =>
    mutation<T>('PATCH', path, body, queue),
  delete: <T>(path: string, queue?: boolean) =>
    mutation<T>('DELETE', path, undefined, queue),
};
