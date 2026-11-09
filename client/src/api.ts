const TOKEN_KEY = 'smartclass.token';
const ROLE_KEY = 'smartclass.role';

export type SessionRole = 'admin' | 'student';

let onUnauthorized = () => {};

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getRole(): SessionRole | null {
  const role = sessionStorage.getItem(ROLE_KEY);
  return role === 'admin' || role === 'student' ? role : null;
}

export function setSession(token: string | null, role: SessionRole | null): void {
  if (token && role) {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(ROLE_KEY, role);
    return;
  }
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(ROLE_KEY);
}

export function setToken(token: string | null): void {
  if (!token) setSession(null, null);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? '';
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'The class server is not running.');
  }

  let payload: { success?: boolean; message?: string; data?: T } | null = null;
  try {
    payload = (await response.json()) as { success?: boolean; message?: string; data?: T };
  } catch {
    payload = null;
  }

  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    setToken(null);
    onUnauthorized();
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiError(response.status, payload?.message || 'The request could not be completed.');
  }

  return payload?.data as T;
}
