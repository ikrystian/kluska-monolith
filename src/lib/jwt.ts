import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';

export interface AthleteTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'athlete' | 'trainer' | 'admin';
  isGuest?: boolean;
}

const SHORT_MAX_AGE = 24 * 60 * 60; // 24h, mirrors authOptions.session.maxAge
const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30d, mirrors authOptions.jwt.maxAge
// Guests have no password to log back in with, so their token lives long and
// the SPA silently re-issues it from the device id when it expires.
const GUEST_MAX_AGE = 365 * 24 * 60 * 60; // 365d

export function signAthleteToken(
  user: { id: string; email: string; name: string; role: 'athlete' | 'trainer' | 'admin'; isGuest?: boolean },
  rememberMe = false
): string {
  const payload: AthleteTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    ...(user.isGuest ? { isGuest: true } : {}),
  };

  return jwt.sign(payload, env.NEXTAUTH_SECRET, {
    expiresIn: user.isGuest ? GUEST_MAX_AGE : rememberMe ? REMEMBER_MAX_AGE : SHORT_MAX_AGE,
  });
}

export function verifyAthleteToken(token: string): AthleteTokenPayload | null {
  try {
    const payload = jwt.verify(token, env.NEXTAUTH_SECRET) as AthleteTokenPayload & { aud?: unknown };
    // Tokens minted for another purpose (e.g. impersonation grants) carry an audience and are not API sessions.
    return payload.aud === undefined ? payload : null;
  } catch {
    return null;
  }
}

/**
 * Short-lived proof that an admin may sign in as someone else. Issued only by
 * `/api/auth/impersonate` (which checks the caller is an admin) and redeemed by
 * the credentials provider — a bare user id is never enough to get a session.
 */
export interface ImpersonationPayload {
  /** `impersonate`: become `sub`. `restore`: an impersonating admin returns to their own account `sub`. */
  purpose: 'impersonate' | 'restore';
  sub: string;
  /** The admin who asked. */
  by: string;
}

const IMPERSONATE_MAX_AGE = 60; // seconds — redeemed immediately by the same click
const RESTORE_MAX_AGE = 12 * 60 * 60; // an impersonation session ends within a working day

export function signImpersonationToken(payload: ImpersonationPayload): string {
  return jwt.sign(payload, env.NEXTAUTH_SECRET, {
    expiresIn: payload.purpose === 'restore' ? RESTORE_MAX_AGE : IMPERSONATE_MAX_AGE,
    audience: 'impersonation',
  });
}

export function verifyImpersonationToken(token: string): ImpersonationPayload | null {
  try {
    const payload = jwt.verify(token, env.NEXTAUTH_SECRET, { audience: 'impersonation' }) as ImpersonationPayload;
    return payload.purpose === 'impersonate' || payload.purpose === 'restore' ? payload : null;
  } catch {
    return null;
  }
}
