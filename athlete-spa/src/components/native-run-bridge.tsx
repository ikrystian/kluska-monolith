import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { useAuth } from '@/contexts/AuthContext';
import { RunTracking, isNativeRunTrackingAvailable } from '@/lib/run-tracking';

export const RECORD_PATH = '/athlete/running/record';

/** The launch check runs once per app start, not every time the athlete leaves the recorder. */
let launchChecked = false;

/**
 * The native recorder keeps going after the athlete leaves the run screen or
 * the WebView is recreated. Whenever the app is opened or brought back (e.g.
 * by tapping the lock-screen notification) with a run still active, return
 * to the recorder so it can be paused, finished and saved.
 */
export function NativeRunBridge() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const userId = user?.uid;
  const onRecordScreen = pathname.startsWith(RECORD_PATH);

  useEffect(() => {
    if (!userId || onRecordScreen || !isNativeRunTrackingAvailable()) return;

    let cancelled = false;
    const openActiveRun = () => {
      RunTracking.getState()
        .then(({ status }) => {
          if (!cancelled && status !== 'idle') navigate(RECORD_PATH);
        })
        .catch(() => undefined);
    };

    if (!launchChecked) {
      launchChecked = true;
      openActiveRun();
    }
    const listener = App.addListener('resume', openActiveRun);
    return () => {
      cancelled = true;
      void listener.then(handle => handle.remove());
    };
  }, [userId, onRecordScreen, navigate]);

  return null;
}
