import { useEffect, useRef } from 'react';
import { startLiveWidget, stopLiveWidget, updateLiveWidget, type LiveWidgetState } from '@/lib/live-widget';

/** GPS fixes arrive about once a second; the widget doesn't need that cadence. */
const MIN_UPDATE_INTERVAL_MS = 4000;

/**
 * Shows `state` on the Android home-screen widget while it is non-null and
 * clears it when it becomes null or the component unmounts. `elapsedMs` is
 * read at send time, so it does not trigger updates by itself — the widget
 * keeps its own clock; only changes to the other fields are pushed.
 */
export function useLiveWidget(state: Omit<LiveWidgetState, 'elapsedMs'> | null, getElapsedMs: () => number) {
  const getElapsedRef = useRef(getElapsedMs);
  getElapsedRef.current = getElapsedMs;

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

    const send = () => {
      const payload: LiveWidgetState = { ...(JSON.parse(key) as Omit<LiveWidgetState, 'elapsedMs'>), elapsedMs: getElapsedRef.current() };
      lastSentAtRef.current = Date.now();
      if (!startedRef.current) {
        startedRef.current = true;
        void startLiveWidget(payload);
      } else {
        void updateLiveWidget(payload);
      }
    };

    clearTimeout(timeoutRef.current);
    const wait = startedRef.current ? MIN_UPDATE_INTERVAL_MS - (Date.now() - lastSentAtRef.current) : 0;
    if (wait > 0) timeoutRef.current = setTimeout(send, wait);
    else send();

    return () => clearTimeout(timeoutRef.current);
  }, [key]);

  useEffect(
    () => () => {
      if (startedRef.current) {
        startedRef.current = false;
        void stopLiveWidget();
      }
    },
    []
  );
}
