// The single API client for the SPA. Pages and components call these functions;
// they never call fetch directly and never import one another (architecture §5).

export type Role = 'viewer' | 'editor' | 'admin';
export type Me = { email: string; role: Role };

// Mirrors the server's { error: { code, message } } envelope so callers can
// branch on a stable code rather than parsing messages.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { Accept: 'application/json', ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'ERROR',
      body?.error?.message ?? res.statusText,
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  getMe: () => request<Me>('/api/me'),
};
