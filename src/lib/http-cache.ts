import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

/**
 * JSON response with an ETag. When the client sends a matching If-None-Match
 * header, returns 304 with no body — the browser then serves the cached copy,
 * so full data is transferred only when it actually changed.
 */
export function jsonWithEtag(request: NextRequest, payload: unknown): NextResponse {
  const body = JSON.stringify(payload);
  const etag = `"${createHash('sha1').update(body).digest('hex')}"`;

  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, no-cache' },
    });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ETag: etag,
      'Cache-Control': 'private, no-cache',
    },
  });
}
