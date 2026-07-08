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
    return jwt.verify(token, env.NEXTAUTH_SECRET) as AthleteTokenPayload;
  } catch {
    return null;
  }
}
