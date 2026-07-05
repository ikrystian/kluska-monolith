import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials } from '@/lib/auth';
import { signAthleteToken } from '@/lib/jwt';

/**
 * Bearer-token login endpoint for cross-origin clients (the athlete SPA,
 * and eventually Capacitor) that can't rely on the NextAuth session cookie.
 * Reuses the exact same credential check as the NextAuth credentials
 * provider (src/lib/auth.ts) so behavior stays identical between both apps.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, rememberMe } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await verifyCredentials(email, password);
    const token = signAthleteToken(user, Boolean(rememberMe));

    return NextResponse.json({ token, user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid credentials' },
      { status: 401 }
    );
  }
}
