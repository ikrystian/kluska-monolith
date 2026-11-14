import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

/** Revalidate on every use, but let the browser keep the copy for the 304 path. */
const REVALIDATE = 'private, no-cache';

export interface SerializedJson {
  /** The JSON text, or its UTF-8 bytes (see `compact`). */
  body: string | Uint8Array<ArrayBuffer>;
  etag: string;
}

/** Strong ETag for a version string (a body, or anything that changes when the body does). */
export function etagOf(version: string): string {
  return `"${createHash('sha1').update(version).digest('hex')}"`;
}

/** Serializes once so the same bytes can be hashed, cached and sent. */
export function serializeJson(payload: unknown): SerializedJson {
  const body = JSON.stringify(payload);
  return { body, etag: etagOf(body) };
}

/**
 * Same response, held as UTF-8 bytes. A JS string with any non-Latin-1
 * character (every Polish text) takes two bytes per character, so a response
 * kept in a cache costs half as much this way — and is sent without re-encoding.
 */
export function compact({ body, etag }: SerializedJson): SerializedJson {
  return { body: typeof body === 'string' ? new Uint8Array(Buffer.from(body, 'utf8')) : body, etag };
}

/** Bytes a serialized response occupies while cached. */
export function byteSize({ body }: SerializedJson): number {
  return typeof body === 'string' ? body.length * 2 : body.byteLength;
}

const opaque = (tag: string) => tag.trim().replace(/^W\//, '');

/**
 * Whether the client's `If-None-Match` names `etag`.
 *
 * Uses the weak comparison RFC 9110 prescribes for If-None-Match: a proxy that
 * compresses the response (Cloudflare does) rewrites `"abc"` to `W/"abc"`, and
 * the browser sends that back — a plain string compare would never match and
 * every revalidation would download the full body again.
 */
export function etagMatches(request: Request, etag: string): boolean {
  const header = request.headers.get('if-none-match');
  if (!header) return false;
  if (header.trim() === '*') return true;
  const wanted = opaque(etag);
  return header.split(',').some((candidate) => opaque(candidate) === wanted);
}

/** 304 with no body — the browser serves its cached copy. */
export function notModified(etag: string, cacheControl: string = REVALIDATE): NextResponse {
  return new NextResponse(null, {
    status: 304,
    headers: { ETag: etag, 'Cache-Control': cacheControl },
  });
}

/** Sends an already serialized JSON body, or 304 when the client has it. */
export function sendSerialized(
  request: Request,
  { body, etag }: SerializedJson,
  cacheControl: string = REVALIDATE
): NextResponse {
  if (etagMatches(request, etag)) return notModified(etag, cacheControl);

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ETag: etag,
      'Cache-Control': cacheControl,
    },
  });
}

/**
 * JSON response with an ETag. When the client sends a matching If-None-Match
 * header, returns 304 with no body — the browser then serves the cached copy,
 * so full data is transferred only when it actually changed.
 */
export function jsonWithEtag(request: Request, payload: unknown, cacheControl: string = REVALIDATE): NextResponse {
  return sendSerialized(request, serializeJson(payload), cacheControl);
}
