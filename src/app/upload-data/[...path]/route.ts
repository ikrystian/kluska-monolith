import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';
import { etagMatches } from '@/lib/http-cache';

export const runtime = 'nodejs';

/** Same folder the upload route writes to. */
const UPLOAD_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), 'upload-data');

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

const IMMUTABLE = 'public, max-age=31536000, immutable';

/** `bytes=start-end` → inclusive offsets, or `null` when absent/unsatisfiable. */
function parseRange(header: string | null, size: number): { start: number; end: number } | null | 'invalid' {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;

  let start: number;
  let end: number;
  if (match[1] === '') {
    // Suffix form: the last N bytes.
    const suffix = Number(match[2]);
    if (suffix === 0) return 'invalid';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  return start > end || start >= size ? 'invalid' : { start, end };
}

/**
 * Serves a file previously stored under `upload-data/`.
 *
 * File names are random UUIDs and never rewritten, so responses are immutable.
 * Range requests are honoured: without them a `<video>` has to download the
 * whole clip before it can seek (and Safari refuses to play it at all).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const relative = segments.join('/');
  const filePath = path.resolve(/* turbopackIgnore: true */ UPLOAD_DIR, relative);

  // Refuse anything that escapes the upload folder.
  if (filePath !== UPLOAD_DIR && !filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return new NextResponse('Not found', { status: 404 });
  }

  let fileStat;
  try {
    fileStat = await stat(/* turbopackIgnore: true */ filePath);
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
  if (!fileStat.isFile()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const etag = `"${fileStat.size.toString(16)}-${Math.floor(fileStat.mtimeMs).toString(16)}"`;
  const baseHeaders = {
    'Content-Type': CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream',
    'Cache-Control': IMMUTABLE,
    'Accept-Ranges': 'bytes',
    ETag: etag,
    'Last-Modified': fileStat.mtime.toUTCString(),
  };

  // A revalidation (e.g. a forced reload): answer without touching the file.
  if (etagMatches(request, etag)) {
    return new NextResponse(null, { status: 304, headers: baseHeaders });
  }

  const range = parseRange(request.headers.get('range'), fileStat.size);
  if (range === 'invalid') {
    return new NextResponse(null, {
      status: 416,
      headers: { ...baseHeaders, 'Content-Range': `bytes */${fileStat.size}` },
    });
  }

  const stream = (options?: { start: number; end: number }) =>
    Readable.toWeb(createReadStream(/* turbopackIgnore: true */ filePath, options)) as ReadableStream<Uint8Array>;

  if (range) {
    return new NextResponse(stream(range), {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Length': String(range.end - range.start + 1),
        'Content-Range': `bytes ${range.start}-${range.end}/${fileStat.size}`,
      },
    });
  }

  return new NextResponse(stream(), {
    headers: { ...baseHeaders, 'Content-Length': String(fileStat.size) },
  });
}
