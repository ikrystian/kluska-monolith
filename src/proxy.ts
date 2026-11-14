import { NextRequest, NextResponse } from 'next/server';
import { isAllowedOrigin } from '@/lib/allowed-origins';

/**
 * CORS for /api/* and the uploaded media under /upload-data/*. The existing
 * Next.js web app calls the API same-origin and is unaffected; this exists so
 * the athlete SPA (served from a different origin, e.g. Vite on :5173) can
 * call this backend directly. Media needs it too: the SPA draws uploaded
 * photos onto a canvas (Instagram share cards), which only exports when the
 * image was fetched with CORS.
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
  const isMedia = request.nextUrl.pathname.startsWith('/upload-data/');

  if (request.method === 'OPTIONS') {
    return applyCorsHeaders(new NextResponse(null, { status: 204 }), origin);
  }

  const response = applyCorsHeaders(NextResponse.next(), origin);
  // Uploaded media is public (no auth, no cookies), so it can be wildcard-CORS.
  // A plain <img> load of the same URL (no Origin header) is cached by the browser
  // without ACAO; a later fetch() from the SPA then fails. Wildcard keeps both valid.
  if (isMedia) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.delete('Access-Control-Allow-Credentials');
  }
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/upload-data/:path*'],
};
