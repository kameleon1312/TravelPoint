export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
}

export class TravelPointApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'TravelPointApiError';
  }
}

export function createApiClient(baseUrl: string, getToken: () => Promise<string | null>) {
  async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const token = await getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({ code: 'UNKNOWN', message: res.statusText }))) as ApiError;
      throw new TravelPointApiError(err.code, err.message, res.status);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
