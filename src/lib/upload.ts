/**
 * Local file uploads.
 *
 * Files are POSTed to `/api/upload`, stored on the server under the repo's
 * `upload-data/` folder, and served back from `/upload-data/<filename>`.
 * This replaces the previous UploadThing integration.
 */

export interface UploadedFile {
  /** Public path the file is served from, e.g. `/upload-data/ab12.jpg`. */
  url: string;
  name: string;
  size: number;
  type: string;
}

/**
 * Uploads one or more files to the local `/api/upload` endpoint.
 * Returns metadata for each stored file (in the same order).
 */
export async function uploadClientFiles(files: File[]): Promise<UploadedFile[]> {
  if (files.length === 0) return [];

  const body = new FormData();
  for (const file of files) body.append('files', file);

  const res = await fetch('/api/upload', { method: 'POST', body });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error || `Nie udało się przesłać pliku (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as { files: UploadedFile[] };
  return data.files;
}

/**
 * Normalises a stored image reference to something usable as an `<img src>`.
 *
 * New uploads store a `/upload-data/...` path (or an absolute URL when pasted
 * by hand). Older rows created under UploadThing stored a bare file key, which
 * still resolves against the UploadThing CDN.
 */
export function resolveStoredImageUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (/^(https?:|data:|blob:|\/)/.test(value)) return value;
  return `https://utfs.io/f/${value}`;
}
