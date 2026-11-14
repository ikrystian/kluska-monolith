import { NextResponse } from 'next/server';

/**
 * Hands the Web Push public key to clients so it lives in one place (the
 * backend env) instead of being baked into every frontend build. The key is
 * public by design — it only identifies this server to the push service.
 */
export async function GET() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  if (!publicKey || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Web Push not configured' }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
