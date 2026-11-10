import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS for /api/* only. The existing Next.js web app calls the API
 * same-origin and is unaffected; this exists so the athlete SPA (served from
 * a different origin, e.g. Vite on :5173) can call this backend directly.
 */
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (origin === 'capacitor://localhost' || origin.startsWith('capacitor://')) return true;
  if (origin.startsWith('http://localhost') || origin.startsWith('https://localhost')) return true;

  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const ipPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipPattern);
    if (match) {
      const [, p1, p2, p3, p4] = match;
      const o1 = parseInt(p1, 10);
      const o2 = parseInt(p2, 10);
      const o3 = parseInt(p3, 10);
      const o4 = parseInt(p4, 10);
      if (o1 === 127 || o1 === 10 || (o1 === 172 && o2 >= 16 && o2 <= 31) || (o1 === 192 && o2 === 168)) {
        return true;
      }
    }
  } catch {
    // If URL parsing fails, ignore
  }

  return false;
}

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

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  return applyCorsHeaders(NextResponse.next(), origin);
}

export const config = {
  matcher: ['/api/:path*'],
};
