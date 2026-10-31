export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfter?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const body = (await res.json().catch(() => null)) as
    { code?: string; message?: string; retryAfter?: number } | T | null;

  if (!res.ok) {
    const err = (body ?? {}) as { code?: string; message?: string; retryAfter?: number };
    throw new ApiError(
      res.status,
      err.code ?? 'HTTP_ERROR',
      err.message ?? `Request failed (${res.status})`,
      err.retryAfter,
    );
  }
  return body as T;
}

export const isApiError = (e: unknown, status?: number): e is ApiError =>
  e instanceof ApiError && (status === undefined || e.status === status);
