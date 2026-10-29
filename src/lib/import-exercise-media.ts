import { mkdir, writeFile, access } from 'fs/promises';
import path from 'path';

/**
 * Pobiera media ćwiczeń openGym (obrazek `image_url` + animacja `animation_url`)
 * i zapisuje je lokalnie pod `upload-data/`, skąd są serwowane przez
 * `/upload-data/...`. Import nie linkuje wtedy do zewnętrznych źródeł.
 *
 * Pliki nazywane są na podstawie id ćwiczenia openGym, dzięki czemu ponowny
 * import pomija już pobrane pliki (idempotentność).
 */

const UPLOAD_DIR = path.join(process.cwd(), 'upload-data');
const MAX_FILE_SIZE = 128 * 1024 * 1024; // 128 MB — tyle samo co w /api/upload

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

function extensionForUrl(url: string): string {
  const clean = url.split('?')[0].toLowerCase();
  const m = clean.match(/\.([a-z0-9]+)$/);
  return m ? m[1] : 'bin';
}

function extensionForContentType(contentType: string | null | undefined): string | null {
  if (!contentType) return null;
  return EXTENSION_BY_CONTENT_TYPE[contentType.toLowerCase()] ?? null;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

export interface DownloadedMedia {
  /** Publiczna lokalna ścieżka (np. /upload-data/og-1234.webp) */
  imageUrl: string;
  /** Publiczna lokalna ścieżka animacji (np. /upload-data/og-1234.mp4) */
  animationUrl: string;
}

/**
 * Pobiera obrazek i animację ćwiczenia i zapisuje lokalnie.
 * Jeśli plik już istnieje (z poprzedniego importu), pomija pobieranie.
 *
 * W przypadku błędu zwraca pusty string dla danego media — dokument nadal
 * zostaje utworzony, z oryginalnym (zewnętrznym) URL jako fallbackiem.
 */
export async function downloadExerciseMedia(
  exerciseId: string,
  imageUrl: string,
  animationUrl: string
): Promise<Partial<DownloadedMedia>> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const result: Partial<DownloadedMedia> = {};

  if (imageUrl) {
    const ext = extensionForUrl(imageUrl);
    const filename = `og-${exerciseId}-img.${ext}`;
    const absolute = path.join(UPLOAD_DIR, filename);
    if (await fileExists(absolute)) {
      result.imageUrl = `/upload-data/${filename}`;
    } else {
      result.imageUrl = await downloadFile(imageUrl, absolute);
    }
  }

  if (animationUrl) {
    const ext = extensionForUrl(animationUrl);
    const filename = `og-${exerciseId}-anim.${ext}`;
    const absolute = path.join(UPLOAD_DIR, filename);
    if (await fileExists(absolute)) {
      result.animationUrl = `/upload-data/${filename}`;
    } else {
      result.animationUrl = await downloadFile(animationUrl, absolute);
    }
  }

  return result;
}

async function downloadFile(url: string, absolutePath: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error(`media download ${url} -> HTTP ${response.status}`);
      return '';
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_FILE_SIZE) {
      console.error(`media download ${url} -> too large (${declaredLength})`);
      return '';
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_FILE_SIZE) {
      console.error(`media download ${url} -> too large (${buffer.length})`);
      return '';
    }

    // Używaj rozszerzenia z Content-Type, jeśli pasuje; w innym wypadku z URL.
    const contentExt = extensionForContentType(response.headers.get('content-type'));
    let finalPath = absolutePath;
    if (contentExt && !absolutePath.endsWith(`.${contentExt}`)) {
      finalPath = absolutePath.replace(/\.[^.]+$/, `.${contentExt}`);
    }

    await writeFile(finalPath, buffer);
    return `/upload-data/${path.basename(finalPath)}`;
  } catch (error) {
    console.error(`media download ${url} -> error:`, error instanceof Error ? error.message : error);
    return '';
  }
}

/** Typ opisujący pozycję do wsadowego pobierania mediów przez `downloadAllExerciseMedia`. */
export interface MediaDownloadItem {
  id: string;
  imageUrl: string;
  animationUrl: string;
}

/**
 * Pobiera obrazki + animacje dla całej listy ćwiczeń z ograniczoną
 * liczbą równoległych połączeń. Zwraca mapę: id ćwiczenia -> lokalne URL-e.
 */
export async function downloadAllExerciseMedia(
  items: MediaDownloadItem[],
  concurrency = 10
): Promise<Map<string, Partial<DownloadedMedia>>> {
  const results = new Map<string, Partial<DownloadedMedia>>();
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx];
      if (!item) continue;
      const media = await downloadExerciseMedia(item.id, item.imageUrl, item.animationUrl);
      results.set(item.id, media);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, worker);
  await Promise.all(workers);

  return results;
}