import { useEffect, useRef } from 'react';
import { setLiveWidgetInteractive, startLiveWidget, stopLiveWidget, updateLiveWidget, type LiveWidgetState } from '@/lib/live-widget';

/**
 * GPS fixes arrive about once a second; the widget doesn't need that cadence.
 * (A run's distance and pace are read natively anyway — this only bounds churn.)
 */
const MIN_RUN_UPDATE_INTERVAL_MS = 4000;

interface LiveWidgetOptions {
  /**
   * Leave the session on the widget when the component unmounts while it is
   * still active (the athlete navigated elsewhere mid-workout), marked as
   * non-interactive. By default an unmount clears it.
   */
  keepOnUnmount?: boolean;
}

/**
 * Shows `state` on the Android home-screen widget while it is non-null and
 * clears it when it becomes null. `elapsedMs` is read at send time, so it does
 * not trigger updates by itself — the widget keeps its own clock; only
 * changes to the other fields are pushed.
 */
export function useLiveWidget(
  state: Omit<LiveWidgetState, 'elapsedMs'> | null,
  getElapsedMs: () => number,
  { keepOnUnmount = false }: LiveWidgetOptions = {}
) {
  const getElapsedRef = useRef(getElapsedMs);
  getElapsedRef.current = getElapsedMs;
  const keepOnUnmountRef = useRef(keepOnUnmount);
  keepOnUnmountRef.current = keepOnUnmount;

  const startedRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const key = state ? JSON.stringify(state) : null;

  useEffect(() => {
    if (key === null) {
      clearTimeout(timeoutRef.current);
      if (startedRef.current) {
        startedRef.current = false;
        void stopLiveWidget();
      }
      return;
    }

    const next = JSON.parse(key) as Omit<LiveWidgetState, 'elapsedMs'>;
    const minInterval = next.activity === 'run' ? MIN_RUN_UPDATE_INTERVAL_MS : 0;

    const send = () => {
      const payload: LiveWidgetState = { ...next, elapsedMs: getElapsedRef.current() };
      lastSentAtRef.current = Date.now();
      if (!startedRef.current) {
        startedRef.current = true;
        void startLiveWidget(payload);
      } else {
        void updateLiveWidget(payload);
      }
    };

    clearTimeout(timeoutRef.current);
    const wait = startedRef.current ? minInterval - (Date.now() - lastSentAtRef.current) : 0;
    if (wait > 0) timeoutRef.current = setTimeout(send, wait);
    else send();

    return () => clearTimeout(timeoutRef.current);
  }, [key]);

  useEffect(
    () => () => {
      if (!startedRef.current) return;
      startedRef.current = false;
      if (keepOnUnmountRef.current) void setLiveWidgetInteractive(false);
      else void stopLiveWidget();
    },
    []
  );
}
