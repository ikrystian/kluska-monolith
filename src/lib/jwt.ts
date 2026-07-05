import jwt from 'jsonwebtoken';
import { env } from '@/lib/env';

export interface AthleteTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'athlete' | 'trainer' | 'admin';
}

const SHORT_MAX_AGE = 24 * 60 * 60; // 24h, mirrors authOptions.session.maxAge
const REMEMBER_MAX_AGE = 30 * 24 * 60 * 60; // 30d, mirrors authOptions.jwt.maxAge

export function signAthleteToken(
  user: { id: string; email: string; name: string; role: 'athlete' | 'trainer' | 'admin' },
  rememberMe = false
): string {
  const payload: AthleteTokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  return jwt.sign(payload, env.NEXTAUTH_SECRET, {
    expiresIn: rememberMe ? REMEMBER_MAX_AGE : SHORT_MAX_AGE,
  });
}

export function verifyAthleteToken(token: string): AthleteTokenPayload | null {
  try {
    return jwt.verify(token, env.NEXTAUTH_SECRET) as AthleteTokenPayload;
  } catch {
    return null;
  }
}
