import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { getRequestUser } from '@/lib/api-auth';

export const runtime = 'nodejs';

/** On-disk upload folder (repo root / upload-data). */
const UPLOAD_DIR = path.join(process.cwd(), 'upload-data');

/** Hard cap per file — comfortably covers 100 MB exercise media. */
const MAX_FILE_SIZE = 128 * 1024 * 1024;

/** Only images (including animated GIF) are accepted. */
const ALLOWED_TYPE_PREFIX = 'image/';

const EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

function extensionFor(file: File): string {
  const fromType = EXTENSION_BY_TYPE[file.type];
  if (fromType) return fromType;
  const fromName = file.name.includes('.')
    ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
  return fromName || 'bin';
}

/**
 * Stores uploaded images on the local filesystem under `upload-data/` and
 * returns the public path(s) they are served from (`/upload-data/<file>`).
 *
 * Accepts a single `file` field or repeated `files` fields (multipart).
 * Response shape covers every existing caller:
 *   { url, files: [{ url, name, size, type }] }
 */
export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Oczekiwano multipart/form-data.' }, { status: 400 });
  }

  const inputs = [...form.getAll('files'), ...form.getAll('file')].filter(
    (entry): entry is File => typeof entry === 'object' && entry !== null && 'arrayBuffer' in entry,
  );

  if (inputs.length === 0) {
    return NextResponse.json({ error: 'Nie przesłano żadnego pliku.' }, { status: 400 });
  }

  for (const file of inputs) {
    if (!file.type.startsWith(ALLOWED_TYPE_PREFIX)) {
      return NextResponse.json(
        { error: `Nieobsługiwany typ pliku: ${file.type || 'nieznany'}.` },
        { status: 415 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Plik jest za duży (maks. ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB).` },
        { status: 413 },
      );
    }
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const files = [] as { url: string; name: string; size: number; type: string }[];
  for (const file of inputs) {
    const filename = `${randomUUID()}.${extensionFor(file)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(UPLOAD_DIR, filename), buffer);
    files.push({
      url: `/upload-data/${filename}`,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  }

  return NextResponse.json({ url: files[0].url, files });
}
