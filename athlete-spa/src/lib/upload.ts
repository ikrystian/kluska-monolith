/**
 * Local file uploads (athlete SPA side).
 *
 * Files are POSTed to the backend's `/api/upload`, stored on the server under
 * its `upload-data/` folder, and served back from `/upload-data/<filename>`.
 * The relative path is what gets persisted; wrap it in `resolveMediaUrl()`
 * before using it as an `<img src>` since this SPA runs on another origin.
 */

import { apiFetch } from '@/lib/api-client';

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

/** Uploads one or more files and returns metadata for each stored file. */
export async function uploadClientFiles(files: File[]): Promise<UploadedFile[]> {
  if (files.length === 0) return [];

  const body = new FormData();
  for (const file of files) body.append('files', file);

  const res = await apiFetch('/api/upload', { method: 'POST', body });
  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error || `Nie udało się przesłać pliku (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as { files: UploadedFile[] };
  return data.files;
}

/**
 * Normalises a stored image reference. New uploads store a `/upload-data/...`
 * path; older rows created under UploadThing stored a bare file key which
 * still resolves against the UploadThing CDN. Pair with `resolveMediaUrl()`.
 */
export function resolveStoredImageUrl(value: string | null | undefined): string {
  if (!value) return '';
  if (/^(https?:|data:|blob:|\/)/.test(value)) return value;
  return `https://utfs.io/f/${value}`;
}
