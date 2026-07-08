import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { verifyAthleteToken } from '@/lib/jwt';

export interface RequestUser {
  id: string;
  email: string;
  name: string;
  role: 'athlete' | 'trainer' | 'admin';
  /** True for per-device guest accounts (Capacitor app without registration). */
  isGuest?: boolean;
}

/**
 * Resolves the authenticated user for an API route from either auth
 * mechanism supported by this backend:
 *  - `Authorization: Bearer <token>` — used by the athlete SPA/Capacitor
 *  - NextAuth session cookie — used by the existing Next.js web app
 *
 * Route handlers should call this instead of `getServerSession(authOptions)`
 * directly so they work for both clients without any behavior change for
 * the existing cookie-based app.
 */
export async function getRequestUser(request: Request): Promise<RequestUser | null> {
  const authHeader = request.headers.get('authorization');
  // Full-page browser navigations (e.g. the Strava "connect" redirect) can't
  // attach an Authorization header, so those routes accept the token as a
  // `?token=` query param instead.
  const queryToken = new URL(request.url).searchParams.get('token');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  const token = bearerToken ?? queryToken;

  if (token) {
    const payload = verifyAthleteToken(token);
    if (!payload) return null;

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      isGuest: payload.isGuest,
    };
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}
