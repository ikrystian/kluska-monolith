const API_BASE_URL = import.meta.env.VITE_API_URL;

export const TOKEN_STORAGE_KEY = 'athlete-spa:token';

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

/** Registered by AuthContext so a 401 anywhere can clear the session. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

/**
 * Media URLs are stored relative (e.g. `/api/images/<id>`) so they work in the
 * same-origin Next.js app; this SPA runs on a different origin, so plain
 * <img src> would resolve them against the SPA host. Prefixes the backend URL
 * for relative paths, passes absolute/data/blob URLs through untouched.
 */
export function resolveMediaUrl(url: string): string;
export function resolveMediaUrl(url: string | null | undefined): string | undefined;
export function resolveMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

/**
 * Same-shaped drop-in for the relative `fetch('/api/...')` calls the ported
 * athlete pages/hooks already make: prefixes the cross-origin backend URL
 * and attaches the Bearer token this SPA uses instead of a session cookie.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    unauthorizedHandler?.();
  }

  return response;
}
