import { NextResponse } from 'next/server';
import { createReadStream } from 'fs';
import { stat } from 'fs/promises';
import { Readable } from 'stream';
import path from 'path';

export const runtime = 'nodejs';

/** Same folder the upload route writes to. */
const UPLOAD_DIR = path.join(process.cwd(), 'upload-data');

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

/** Serves a file previously stored under `upload-data/`. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  const relative = segments.join('/');
  const filePath = path.resolve(UPLOAD_DIR, relative);

  // Refuse anything that escapes the upload folder.
  if (filePath !== UPLOAD_DIR && !filePath.startsWith(UPLOAD_DIR + path.sep)) {
    return new NextResponse('Not found', { status: 404 });
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
  if (!fileStat.isFile()) {
    return new NextResponse('Not found', { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const body = Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;

  return new NextResponse(body, {
    headers: {
      'Content-Type': CONTENT_TYPE_BY_EXT[ext] ?? 'application/octet-stream',
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
