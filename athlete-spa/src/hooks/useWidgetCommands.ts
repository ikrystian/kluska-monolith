import { useEffect, useRef } from 'react';
import { isLiveWidgetSupported, takeWidgetCommands } from '@/lib/live-widget';

/** The widget's button only queues a command; this is how soon a visible screen notices it. */
const POLL_INTERVAL_MS = 1500;
/** A command older than this was tapped long ago (screen closed, WebView asleep) and would surprise now. */
const MAX_COMMAND_AGE_MS = 30_000;

/**
 * Carries out commands sent from the home-screen widget while the calling
 * screen is mounted. Commands are looked at on a short timer and the moment
 * the app becomes visible again; ones that went stale in between are dropped.
 */
export function useWidgetCommands(handlers: Record<string, () => void>, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !isLiveWidgetSupported()) return;

    let cancelled = false;
    let polling = false;

    const poll = async () => {
      if (polling) return;
      polling = true;
      try {
        const commands = await takeWidgetCommands();
        if (cancelled) return;
        for (const command of commands) {
          if (Date.now() - command.createdAt > MAX_COMMAND_AGE_MS) continue;
          handlersRef.current[command.name]?.();
        }
      } finally {
        polling = false;
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled]);
}
