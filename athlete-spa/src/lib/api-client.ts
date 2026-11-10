import { invalidateAfterMutation } from '@/lib/cache-invalidation';
import { reportNetworkFailure, reportNetworkSuccess } from '@/lib/network-status';
import { getOfflineMediaUrl } from '@/lib/offline-media';

const API_BASE_URL = import.meta.env.VITE_API_URL;

export const TOKEN_STORAGE_KEY = 'athlete-spa:token';

/**
 * Last "Zapamiętaj mnie" choice on the login screen. When on, the token lives
 * in localStorage and survives app restarts; when off, it lives in
 * sessionStorage and is gone once the app (or browser tab) is closed.
 */
const REMEMBER_ME_KEY = 'athlete-spa:remember-me';

/** Defaults to on — this is a phone app people expect to stay signed in to. */
export function getRememberMePreference(): boolean {
  return localStorage.getItem(REMEMBER_ME_KEY) !== '0';
}

export function setRememberMePreference(remember: boolean) {
  localStorage.setItem(REMEMBER_ME_KEY, remember ? '1' : '0');
}

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
  const absolute = toAbsoluteMediaUrl(url);
  // Downloaded for offline use ("Pobierz dane") — serve the local copy.
  return getOfflineMediaUrl(absolute) ?? absolute;
}

/** `resolveMediaUrl` without the offline lookup: always the remote URL. */
export function toAbsoluteMediaUrl(url: string): string {
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Lets a local data pack answer GETs without the network (the offline
 * exercise library). `read` returns `undefined` for paths it doesn't own;
 * `afterWrite` sees successful writes so the pack can stay in sync.
 */
export interface LocalReadInterceptor {
  read(path: string): Promise<Response | undefined>;
  afterWrite(path: string, method: string, response: Response): Promise<void>;
}

let localInterceptor: LocalReadInterceptor | null = null;

export function setLocalReadInterceptor(next: LocalReadInterceptor | null) {
  localInterceptor = next;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

/** `persistent` picks localStorage (survives restarts) over sessionStorage. */
export function storeToken(token: string, persistent: boolean) {
  const [target, other] = persistent ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
  target.setItem(TOKEN_STORAGE_KEY, token);
  other.removeItem(TOKEN_STORAGE_KEY);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * Same-shaped drop-in for the relative `fetch('/api/...')` calls the ported
 * athlete pages/hooks already make: prefixes the cross-origin backend URL
 * and attaches the Bearer token this SPA uses instead of a session cookie.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();
  if (method === 'GET' && localInterceptor) {
    const local = await localInterceptor.read(path);
    if (local) return local;
  }

  const response = await apiFetchRemote(path, options);

  // A successful write means anything cached from before it may be stale.
  if (response.ok && method !== 'GET' && method !== 'HEAD') {
    // Awaited so the revalidation below already reads the updated pack.
    await localInterceptor?.afterWrite(path, method, response.clone()).catch(() => undefined);
    invalidateAfterMutation(path);
  }

  return response;
}

/** `apiFetch` that always goes to the server, bypassing any local pack. */
export async function apiFetchRemote(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    // fetch only rejects when the request never reached the server, which is
    // the signal navigator.onLine misses behind a captive portal.
    reportNetworkFailure();
    throw error;
  }
  reportNetworkSuccess();

  if (response.status === 401) {
    clearStoredToken();
    unauthorizedHandler?.();
  }

  return response;
}
