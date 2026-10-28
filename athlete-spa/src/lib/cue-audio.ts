import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Audio cues (rest over, run interval reached) that have to be heard with the
 * app minimised and the screen locked, over whatever music is playing.
 *
 * On Android the native CueAudio plugin (CuePlayer.java in the android
 * project) plays them: a backgrounded WebView neither runs the timer that
 * would trigger the cue nor starts media, and it grabs full audio focus,
 * pausing Spotify. Natively, a cue can be scheduled for a wall-clock time and
 * plays with transient ducking focus — the music dips and comes back.
 *
 * Elsewhere this falls back to HTMLAudioElement, and scheduling is a no-op:
 * the caller's own timer triggers `playCue` when it notices the moment passed.
 *
 * `src` is either an absolute URL or a path into the bundled web app
 * (e.g. `/ronnie_lightweight-baby.mp3`).
 */

interface CueAudioPlugin {
  /** With an id, a cue that already played (from its schedule or an earlier call) is not repeated. */
  play(options: { src: string; id?: string }): Promise<void>;
  /**
   * Plays at `at` (epoch ms) even with the app in the background. `foreground`
   * runs a foreground service to keep the process alive — pass false when
   * another one (the run recorder) already does.
   */
  schedule(options: { id: string; src: string; at: number; foreground?: boolean }): Promise<void>;
  cancel(options: { id: string }): Promise<void>;
  /** Downloads a remote cue ahead of time so it plays instantly and offline. */
  preload(options: { src: string }): Promise<void>;
}

const CueAudio = registerPlugin<CueAudioPlugin>('CueAudio');

export function isNativeCueAudioAvailable(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isPluginAvailable('CueAudio');
}

const NATIVE = isNativeCueAudioAvailable();

const webAudio = new Map<string, HTMLAudioElement>();
const webPlayedIds = new Set<string>();

function webElement(src: string): HTMLAudioElement {
  let audio = webAudio.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = 'auto';
    webAudio.set(src, audio);
  }
  return audio;
}

export function preloadCue(src: string): void {
  if (NATIVE) void CueAudio.preload({ src }).catch(() => undefined);
  else webElement(src);
}

export function playCue(src: string, id?: string): void {
  if (NATIVE) {
    void CueAudio.play({ src, id }).catch(error => console.warn('Could not play cue:', error));
    return;
  }
  if (id) {
    if (webPlayedIds.has(id)) return;
    webPlayedIds.add(id);
  }
  const audio = webElement(src);
  audio.currentTime = 0;
  void audio.play().catch(error => {
    // Autoplay blocked or the file hasn't finished loading.
    console.warn('Could not play cue:', error);
  });
}

/** Returns false where cues can't be scheduled — the caller then relies on `playCue`. */
export function scheduleCue(id: string, src: string, at: number, options: { foreground?: boolean } = {}): boolean {
  if (!NATIVE) return false;
  void CueAudio.schedule({ id, src, at, foreground: options.foreground ?? true }).catch(error =>
    console.warn('Could not schedule cue:', error)
  );
  return true;
}

export function cancelCue(id: string): void {
  if (NATIVE) void CueAudio.cancel({ id }).catch(() => undefined);
}
