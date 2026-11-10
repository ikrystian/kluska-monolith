import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin } from '@/lib/allowed-origins';

/**
 * CORS for /api/* only. The existing Next.js web app calls the API
 * same-origin and is unaffected; this exists so the athlete SPA (served from
 * a different origin, e.g. Vite on :5173) can call this backend directly.
 */
function applyCorsHeaders(response: NextResponse, origin: string | null) {
  if (origin && isAllowedOrigin(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  return applyCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: ['/api/:path*'],
};
