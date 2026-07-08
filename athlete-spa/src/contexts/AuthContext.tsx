import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, setUnauthorizedHandler, TOKEN_STORAGE_KEY } from '@/lib/api-client';
import { getDeviceId } from '@/lib/device-id';

/**
 * Set while the app is used in guest mode, so an expired guest token can be
 * silently re-issued from the device id on the next launch (guests have no
 * password to log back in with).
 */
const GUEST_MODE_KEY = 'athlete-spa:guest-mode';

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: 'athlete' | 'trainer' | 'admin';
  isGuest?: boolean;
}

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'athlete' | 'trainer' | 'admin';
  isGuest?: boolean;
  exp: number;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function userFromToken(token: string): AuthUser | null {
  const payload = decodeToken(token);
  if (!payload) return null;
  if (payload.exp * 1000 < Date.now()) return null;

  return {
    uid: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role,
    isGuest: payload.isGuest,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  isUserLoading: boolean;
  userError: null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<AuthUser>;
  loginAsGuest: () => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Exchanges this device's identifier for a guest Bearer token. The backend
 * creates the per-device athlete account on first call and reuses it after
 * that, so the guest's data survives app restarts and token expiry.
 */
async function requestGuestToken(): Promise<AuthUser> {
  const deviceId = await getDeviceId();
  const response = await apiFetch('/api/auth/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || 'Nie udało się uruchomić trybu gościa.');
  }

  const { token } = await response.json();
  const decoded = userFromToken(token);
  if (!decoded) {
    throw new Error('Otrzymano nieprawidłowy token logowania.');
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token);
  localStorage.setItem(GUEST_MODE_KEY, '1');
  return decoded;
}

/**
 * Replaces next-auth's session cookie for this SPA: a JWT Bearer token
 * (from POST /api/auth/token) stored in localStorage. `useUser()` below
 * mirrors the exact shape the ported pages/hooks/contexts already expect
 * from db-hooks.tsx's next-auth-backed `useUser()`, so nothing downstream
 * needs to change.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (token) {
        const decoded = userFromToken(token);
        if (decoded) {
          setUser(decoded);
          setIsUserLoading(false);
          return;
        }
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }

      // Guest sessions are bound to the device, not to credentials — when the
      // token is gone or expired, re-issue one for the same device account.
      if (localStorage.getItem(GUEST_MODE_KEY)) {
        try {
          const guestUser = await requestGuestToken();
          if (!cancelled) setUser(guestUser);
        } catch {
          // Backend unreachable — leave the user logged out; the login page
          // offers guest mode again.
        }
      }

      if (!cancelled) setIsUserLoading(false);
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (email: string, password: string, rememberMe = false): Promise<AuthUser> => {
    const response = await apiFetch('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, rememberMe }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}) as { error?: string });
      throw new Error(body.error || 'Nieprawidłowy adres e-mail lub hasło.');
    }

    const { token } = await response.json();
    const decoded = userFromToken(token);
    if (!decoded) {
      throw new Error('Otrzymano nieprawidłowy token logowania.');
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.removeItem(GUEST_MODE_KEY);
    setUser(decoded);
    return decoded;
  };

  const loginAsGuest = async (): Promise<AuthUser> => {
    const guestUser = await requestGuestToken();
    setUser(guestUser);
    return guestUser;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(GUEST_MODE_KEY);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, isUserLoading, userError: null, login, loginAsGuest, logout }),
    [user, isUserLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Drop-in replacement for db-hooks.tsx's next-auth-backed `useUser()`. */
export function useUser() {
  const { user, isUserLoading, userError } = useAuth();
  return { user, isUserLoading, userError };
}
