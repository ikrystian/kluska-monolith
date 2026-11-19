import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PluginListenerHandle } from '@capacitor/core';
import { apiFetchRemote, getApiBaseUrl, getStoredToken } from '@/lib/api-client';
import { computeRunSplits, type GeoPoint } from '@/lib/geo';
import type { AdvancedGoal } from '@/lib/advanced-goal';
import { buildSampleCoachPayload, sampleKmCount } from '@/lib/coach-sample';
import {
  RunTracking,
  isNativeRunTrackingAvailable,
  type CoachAdvice,
  type NativeCoachConfig,
} from '@/lib/run-tracking';
import type { RunStatus } from './useRunTracker';

export const COACH_PATH = '/api/athlete/running/coach';
const INTERVAL_M = 1000;
/** Gives up on the "analysing" indicator if no advice arrives (offline, request dropped). */
const PENDING_TIMEOUT_MS = 40_000;
/** Matches the backend's per-user throttle on the coach endpoint. */
export const COACH_TEST_COOLDOWN_MS = 20_000;

export interface CoachTestResult {
  ok: boolean;
  km: number;
  /** Whether there was audio to play (false: no ElevenLabs key, or TTS failed). */
  played: boolean;
  message?: string;
}

function coachErrorMessage(status: number): string {
  if (status === 429) return 'Odczekaj 20 s między zapytaniami do trenera.';
  if (status === 401) return 'Sesja wygasła — zaloguj się ponownie.';
  if (status === 0) return 'Brak połączenia z serwerem.';
  return `Serwer trenera zwrócił błąd ${status}.`;
}

export interface CoachUpdate {
  km: number;
  coaching: CoachAdvice | null;
  speech: string;
  receivedAt: number;
}

interface CoachResponse {
  km: number;
  coaching: CoachAdvice;
  speech: string;
  audio: string | null;
  mime: string;
}

const USE_NATIVE = isNativeRunTrackingAvailable();

function speak(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pl-PL';
    window.speechSynthesis.speak(utterance);
  } catch {
    // No on-device voice — the banner still shows the advice.
  }
}

function playCoachAudio(base64: string | null, mime: string, fallbackText: string) {
  if (!base64) {
    speak(fallbackText);
    return;
  }
  try {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: mime || 'audio/mpeg' }));
    const audio = new Audio(url);
    const release = () => URL.revokeObjectURL(url);
    audio.addEventListener('ended', release, { once: true });
    audio.addEventListener('error', release, { once: true });
    void audio.play().catch(() => {
      release();
      speak(fallbackText);
    });
  } catch {
    speak(fallbackText);
  }
}

/**
 * The AI voice coach of an advanced-goal run: after every full kilometre the
 * run so far goes to the backend, which returns exact progress numbers, a tip
 * and a spoken line voiced by ElevenLabs.
 *
 * On Android the native recorder does the calling and the playing (pass
 * `coachConfig` to the tracker's start / resume) — with the screen locked the
 * WebView is frozen and would miss the kilometre. This hook then only shows
 * the advice it reports. Elsewhere it watches the distance and calls the
 * backend itself.
 */
export function useRunCoach(
  goal: AdvancedGoal | null,
  status: RunStatus,
  distanceMeters: number,
  durationSeconds: number,
  points: GeoPoint[]
) {
  const enabled = Boolean(goal?.voiceCoach);
  const [latest, setLatest] = useState<CoachUpdate | null>(null);
  const [pendingKm, setPendingKm] = useState<number | null>(null);
  /** Bumped when a web request settles, so a kilometre crossed meanwhile gets its turn. */
  const [settledCount, setSettledCount] = useState(0);

  const [testing, setTesting] = useState(false);
  const [testCooldownUntil, setTestCooldownUntil] = useState(0);
  const testKmRef = useRef(0);

  const lastRequestedKmRef = useRef(0);
  const latestKmRef = useRef(0);
  const inFlightRef = useRef(false);
  const previousSpeechRef = useRef<string | null>(null);

  const coachConfig = useMemo<NativeCoachConfig | null>(() => {
    if (!enabled || !goal) return null;
    const token = getStoredToken();
    if (!token) return null;
    return { url: `${getApiBaseUrl()}${COACH_PATH}`, token, goal, intervalM: INTERVAL_M };
  }, [enabled, goal]);

  /** `isTest`: shown regardless of order, and without moving the real run's kilometre count. */
  const accept = (update: CoachUpdate, isTest = false) => {
    if (update.speech) previousSpeechRef.current = update.speech;
    if (!isTest) {
      if (update.km < latestKmRef.current) return;
      latestKmRef.current = update.km;
    }
    setLatest(update);
    setPendingKm(current => (current != null && current <= update.km ? null : current));
  };
  const acceptRef = useRef(accept);
  acceptRef.current = accept;

  // A fresh run starts the coach over.
  useEffect(() => {
    if ((status === 'running' && durationSeconds === 0) || status === 'idle') {
      lastRequestedKmRef.current = 0;
      latestKmRef.current = 0;
      previousSpeechRef.current = null;
      setLatest(null);
      setPendingKm(null);
    }
  }, [status, durationSeconds]);

  // Native: the recorder reports each piece of advice it fetched (and played).
  useEffect(() => {
    if (!USE_NATIVE || !enabled) return;
    let cancelled = false;
    let handle: PluginListenerHandle | undefined;
    void RunTracking.addListener('coach', event => {
      acceptRef.current(
        {
          km: event.km,
          coaching: event.coaching,
          speech: event.speech,
          receivedAt: event.firedAt,
        },
        event.test === true
      );
    }).then(h => {
      if (cancelled) void h.remove();
      else handle = h;
    });
    return () => {
      cancelled = true;
      void handle?.remove();
    };
  }, [enabled]);

  const kmDone = Math.floor(distanceMeters / INTERVAL_M);

  // Native: show "analysing" from the moment the kilometre ticks over until its advice arrives.
  useEffect(() => {
    if (!USE_NATIVE || !enabled || status !== 'running') return;
    if (kmDone < 1 || kmDone <= latestKmRef.current || kmDone <= lastRequestedKmRef.current) return;
    lastRequestedKmRef.current = kmDone;
    setPendingKm(kmDone);
  }, [enabled, status, kmDone]);

  // Web: call the backend after each finished kilometre — only the newest one
  // if several were crossed while a request was still out.
  useEffect(() => {
    if (USE_NATIVE || !enabled || !goal || status !== 'running') return;
    if (kmDone < 1 || kmDone <= lastRequestedKmRef.current || inFlightRef.current) return;
    lastRequestedKmRef.current = kmDone;
    inFlightRef.current = true;
    setPendingKm(kmDone);

    const splits = computeRunSplits(points)
      .filter(split => split.km <= kmDone && split.distanceM >= INTERVAL_M * 0.95)
      .map(split => ({
        km: split.km,
        timeS: Math.round(split.avgPaceMinPerKm * 60),
        elevationGainM: Math.round(split.elevationGainM),
      }));

    const { voiceCoach: _voiceCoach, ...goalPayload } = goal;
    void apiFetchRemote(COACH_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        goal: goalPayload,
        km: kmDone,
        distanceM: Math.round(distanceMeters),
        movingTimeS: Math.round(durationSeconds),
        splits,
        previousSpeech: previousSpeechRef.current,
      }),
    })
      .then(response => (response.ok ? (response.json() as Promise<CoachResponse>) : null))
      .then(data => {
        if (!data) return;
        acceptRef.current({ km: data.km, coaching: data.coaching, speech: data.speech, receivedAt: Date.now() });
        playCoachAudio(data.audio, data.mime, data.speech);
      })
      .catch(error => console.warn('Run coach request failed:', error))
      .finally(() => {
        inFlightRef.current = false;
        setPendingKm(current => (current === kmDone ? null : current));
        setSettledCount(count => count + 1);
      });
    // Only a new kilometre should trigger a request; the rest is read at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, goal, status, kmDone, settledCount]);

  useEffect(() => {
    if (pendingKm == null) return;
    const timeout = setTimeout(() => setPendingKm(null), PENDING_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [pendingKm]);

  /**
   * Test button: sends a made-up kilometre of a run toward this goal (the next
   * one on every tap) down the same path a real kilometre takes — on Android
   * through the native recorder's coach, so its playback is what gets tested.
   */
  const runTest = useCallback(async (): Promise<CoachTestResult> => {
    const token = getStoredToken();
    if (!goal) return { ok: false, km: 0, played: false, message: 'Brak celu biegu.' };
    if (!token) return { ok: false, km: 0, played: false, message: coachErrorMessage(401) };

    const km = (testKmRef.current % sampleKmCount(goal)) + 1;
    testKmRef.current = km;
    const payload = buildSampleCoachPayload(goal, km, previousSpeechRef.current);
    setTesting(true);
    setPendingKm(km);
    try {
      if (USE_NATIVE) {
        // The advice itself arrives as a "coach" event flagged as a test.
        const result = await RunTracking.testCoach({ url: `${getApiBaseUrl()}${COACH_PATH}`, token, payload });
        return result.ok
          ? { ok: true, km, played: result.played }
          : { ok: false, km, played: false, message: coachErrorMessage(result.status) };
      }
      const response = await apiFetchRemote(COACH_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) return { ok: false, km, played: false, message: coachErrorMessage(response.status) };
      const data = (await response.json()) as CoachResponse;
      acceptRef.current({ km: data.km, coaching: data.coaching, speech: data.speech, receivedAt: Date.now() }, true);
      playCoachAudio(data.audio, data.mime, data.speech);
      return { ok: true, km, played: Boolean(data.audio) };
    } catch (error) {
      console.warn('Run coach test failed:', error);
      return { ok: false, km, played: false, message: coachErrorMessage(0) };
    } finally {
      setTesting(false);
      setPendingKm(current => (current === km ? null : current));
      setTestCooldownUntil(Date.now() + COACH_TEST_COOLDOWN_MS);
    }
  }, [goal]);

  return {
    coachConfig,
    latest,
    pendingKm: enabled ? pendingKm : null,
    runTest,
    testing,
    testCooldownUntil,
  };
}
