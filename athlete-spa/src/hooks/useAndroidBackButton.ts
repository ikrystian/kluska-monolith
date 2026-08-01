import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

/** Root screens where "back" means "leave the app" rather than "go up". */
const ROOT_PATHS = ['/athlete/dashboard'];

/** Radix keeps every open overlay marked; any match means something is layered on top. */
const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  '[data-radix-popper-content-wrapper]',
].join(',');

const EXIT_CONFIRM_WINDOW_MS = 2000;

/**
 * Makes Android's hardware/gesture back button behave like the rest of the OS.
 *
 * Without a listener Capacitor's default is to pop the WebView history and, at
 * the first entry, close the app outright — so a back press with a sheet open
 * would skip past it, and a stray press on the dashboard would drop the athlete
 * out of a running session.
 *
 * Priority: dismiss an open overlay → step out of an active workout → go up in
 * the router → require a second press to actually exit.
 */
export function useAndroidBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  // Read inside the handler so the listener never has to be re-registered.
  const locationRef = useRef(location);
  locationRef.current = location;
  const exitPromptedAtRef = useRef(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let removeListener: (() => void) | undefined;
    let cancelled = false;

    const handleBack = ({ canGoBack }: { canGoBack: boolean }) => {
      // 1. An open dialog/sheet/menu owns the gesture. Radix dismisses on
      // Escape, which the hardware button doesn't emit on its own.
      if (document.querySelector(OPEN_OVERLAY_SELECTOR)) {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        return;
      }

      const { pathname, search } = locationRef.current;

      // 2. Leaving an active session is safe — it keeps running and the widget
      // offers a way back — but it is surprising, so say so.
      const isActiveWorkoutSession =
        pathname === '/athlete/log' && new URLSearchParams(search).has('logId');
      if (isActiveWorkoutSession) {
        navigate('/athlete/dashboard');
        toast({
          title: 'Trening w tle',
          description: 'Sesja jest nadal aktywna — wróć do niej w każdej chwili.',
        });
        return;
      }

      // 3. Ordinary "up" navigation.
      if (!ROOT_PATHS.includes(pathname) && canGoBack) {
        navigate(-1);
        return;
      }

      // 4. On a root screen: confirm before closing the app.
      const now = Date.now();
      if (now - exitPromptedAtRef.current < EXIT_CONFIRM_WINDOW_MS) {
        void App.exitApp();
        return;
      }
      exitPromptedAtRef.current = now;
      toast({ description: 'Naciśnij ponownie, aby zamknąć aplikację.' });
    };

    void App.addListener('backButton', handleBack).then(handle => {
      if (cancelled) {
        void handle.remove();
        return;
      }
      removeListener = () => void handle.remove();
    });

    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, [navigate, toast]);
}
