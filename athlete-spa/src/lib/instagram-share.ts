import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Hands an image to the Instagram app as a Story or a feed post.
 *
 * Backed by the native InstagramShare plugin (InstagramSharePlugin.java in the
 * android project). Instagram has no web API for this, so it only works inside
 * the Android app; elsewhere `isInstagramShareAvailable()` is false.
 */

export type InstagramTarget = 'story' | 'post';

interface InstagramSharePlugin {
  isInstalled(): Promise<{ installed: boolean }>;
  /** `image` is raw base64 PNG data (no data-URL prefix). */
  shareToStory(options: { image: string }): Promise<void>;
  shareToPost(options: { image: string }): Promise<void>;
}

const InstagramShare = registerPlugin<InstagramSharePlugin>('InstagramShare');

export function isInstagramShareAvailable(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('InstagramShare');
}

export async function isInstagramInstalled(): Promise<boolean> {
  if (!isInstagramShareAvailable()) return false;
  try {
    return (await InstagramShare.isInstalled()).installed;
  } catch {
    return false;
  }
}

/** Rejection codes of the native plugin that callers can react to. */
export type InstagramShareError = 'NOT_INSTALLED' | 'NOT_SUPPORTED' | 'UNKNOWN';

export function instagramShareErrorCode(error: unknown): InstagramShareError {
  const code = (error as { code?: string } | null)?.code;
  return code === 'NOT_INSTALLED' || code === 'NOT_SUPPORTED' ? code : 'UNKNOWN';
}

export function shareImageToInstagram(target: InstagramTarget, imageBase64: string): Promise<void> {
  return target === 'story'
    ? InstagramShare.shareToStory({ image: imageBase64 })
    : InstagramShare.shareToPost({ image: imageBase64 });
}
