/**
 * Tactile feedback for the moments that happen while the athlete is looking at
 * the barbell rather than the screen: checking off a set, a rest ending, a new
 * personal record.
 *
 * Uses the Vibration API, which the Android WebView supports natively — no
 * Capacitor plugin needed. iOS Safari ignores it, so every call is best-effort
 * and silently does nothing where unsupported.
 */

/** Vibration patterns in ms; a single number is one pulse, arrays alternate on/off. */
const PATTERNS = {
  /** Light confirmation — a set was checked off, a value stepped. */
  tap: 12,
  /** Slightly firmer — a destructive or state-changing action landed. */
  impact: 25,
  /** Two pulses — something finished (rest over). */
  success: [30, 60, 30],
  /** Rising celebration — new personal record. */
  celebrate: [40, 50, 40, 50, 90],
  /** Buzz — validation failed, action rejected. */
  warning: [60, 40, 60],
} as const;

export type HapticPattern = keyof typeof PATTERNS;

const STORAGE_KEY = 'athlete-spa:haptics-enabled';

let enabled = true;
if (typeof window !== 'undefined') {
  enabled = window.localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

/** Persisted so the preference survives a reload; read synchronously on import. */
export function setHapticsEnabled(next: boolean): void {
  enabled = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Private mode / storage full — the in-memory flag still applies this session.
  }
  if (!next) navigator.vibrate?.(0);
}

export function haptic(pattern: HapticPattern): void {
  if (!enabled || !isHapticsSupported()) return;
  try {
    navigator.vibrate(PATTERNS[pattern] as number | number[]);
  } catch {
    // Some WebViews throw when vibration is blocked by policy.
  }
}
