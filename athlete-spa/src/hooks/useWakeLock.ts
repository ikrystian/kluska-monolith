import { useEffect, useRef } from 'react';

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
};

/**
 * Keeps the screen awake while `enabled` is true.
 *
 * Logging a workout means minutes of looking at the phone without touching it
 * (a set, then a rest countdown), so the screen would otherwise lock mid-session.
 *
 * The browser drops the lock whenever the page is hidden — switching apps,
 * pressing power — so it has to be re-acquired on `visibilitychange` rather
 * than just requested once.
 */
export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!enabled || !wakeLock) return;

    let cancelled = false;

    const release = () => {
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => {
          /* already gone — nothing to clean up */
        });
      }
    };

    const acquire = async () => {
      if (cancelled || document.visibilityState !== 'visible' || sentinelRef.current) return;
      try {
        const sentinel = await wakeLock.request('screen');
        if (cancelled) {
          void sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
        });
      } catch {
        // Denied (battery saver, unsupported) — the session just works as before.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire();
      } else {
        release();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      release();
    };
  }, [enabled]);
}
