/**
 * Athlete-facing preferences for permissions the app asks the OS/browser for:
 * location sharing (GPS run tracking) and push notifications. Separate from
 * the OS grant itself — this is "does the athlete want this on", persisted
 * locally (same pattern as haptics) so it survives a reload and gates whether
 * the app bothers prompting for the underlying permission at all.
 */

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  return raw === null ? fallback : raw === 'true';
}

function writeBool(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Private mode / storage full — the in-memory flag still applies this session.
  }
}

const LOCATION_KEY = 'athlete-spa:location-sharing-enabled';
const PUSH_KEY = 'athlete-spa:push-notifications-enabled';
const WORKOUT_REMINDERS_KEY = 'athlete-spa:notif-workout-reminders';
const WEEKLY_SUMMARY_KEY = 'athlete-spa:notif-weekly-summary';

export function isLocationSharingEnabled(): boolean {
  return readBool(LOCATION_KEY, true);
}
export function setLocationSharingEnabled(next: boolean): void {
  writeBool(LOCATION_KEY, next);
}

export function isPushNotificationsEnabled(): boolean {
  return readBool(PUSH_KEY, false);
}
export function setPushNotificationsEnabled(next: boolean): void {
  writeBool(PUSH_KEY, next);
}

export function isWorkoutRemindersEnabled(): boolean {
  return readBool(WORKOUT_REMINDERS_KEY, true);
}
export function setWorkoutRemindersEnabled(next: boolean): void {
  writeBool(WORKOUT_REMINDERS_KEY, next);
}

export function isWeeklySummaryEnabled(): boolean {
  return readBool(WEEKLY_SUMMARY_KEY, false);
}
export function setWeeklySummaryEnabled(next: boolean): void {
  writeBool(WEEKLY_SUMMARY_KEY, next);
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

const REST_CUE_KEY = 'athlete-spa:rest-cue';
/** Before the vibration option the setting was a plain sound on/off switch. */
const LEGACY_REST_SOUND_KEY = 'athlete-spa:rest-sound-enabled';

/** How the rest timer signals that the rest after a completed set is over. */
export type RestCue = 'sound' | 'vibration' | 'none';

export function getRestCue(): RestCue {
  if (typeof window === 'undefined') return 'sound';
  const raw = window.localStorage.getItem(REST_CUE_KEY);
  if (raw === 'sound' || raw === 'vibration' || raw === 'none') return raw;
  return readBool(LEGACY_REST_SOUND_KEY, true) ? 'sound' : 'none';
}
export function setRestCue(next: RestCue): void {
  try {
    window.localStorage.setItem(REST_CUE_KEY, next);
  } catch {
    // Private mode / storage full — nothing else to fall back on here.
  }
}

const SPOTIFY_WIDGET_KEY = 'athlete-spa:spotify-widget-enabled';

export function isSpotifyWidgetEnabled(): boolean {
  return readBool(SPOTIFY_WIDGET_KEY, true);
}
export function setSpotifyWidgetEnabled(next: boolean): void {
  writeBool(SPOTIFY_WIDGET_KEY, next);
}
