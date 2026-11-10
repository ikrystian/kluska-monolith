/**
 * In-memory map of media downloaded for offline use: remote URL → blob: URL.
 *
 * Kept free of imports so `resolveMediaUrl` (api-client) can consult it
 * synchronously without pulling the offline-pack module into a cycle.
 */

const blobUrls = new Map<string, string>();
const videoBlobUrls = new Set<string>();

/** Replaces the whole map, revoking blob URLs that are no longer backed by the pack. */
export function setOfflineMedia(entries: Iterable<[url: string, blob: Blob]>): void {
  clearOfflineMedia();
  for (const [url, blob] of entries) {
    const objectUrl = URL.createObjectURL(blob);
    blobUrls.set(url, objectUrl);
    if (blob.type.startsWith('video/')) videoBlobUrls.add(objectUrl);
  }
}

export function clearOfflineMedia(): void {
  for (const objectUrl of blobUrls.values()) URL.revokeObjectURL(objectUrl);
  blobUrls.clear();
  videoBlobUrls.clear();
}

/** blob: URL for a downloaded remote URL, if the pack has it. */
export function getOfflineMediaUrl(url: string): string | undefined {
  return blobUrls.get(url);
}

/** blob: URLs carry no extension, so video detection has to ask the pack. */
export function isOfflineVideoUrl(url: string): boolean {
  return videoBlobUrls.has(url);
}
