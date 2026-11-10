import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUser } from '@/lib/db-hooks';
import { OPEN_OVERLAY_SELECTOR } from '@/hooks/useAndroidBackButton';
import { countTourTargets, exitActiveTour, startTour } from '@/lib/tours/engine';
import { areToursEnabled, hasSeenTour, markTourSeen } from '@/lib/tours/storage';
import { findTourForRoute } from '@/lib/tours/tours';

/** Lets the page transition finish before anything is measured. */
const SETTLE_MS = 700;
const POLL_MS = 250;
/** Consecutive polls with the same elements on screen before the screen counts as loaded. */
const STABLE_POLLS = 2;
/** A screen that has not settled by now (offline, slow network) is left alone until the next visit. */
const GIVE_UP_MS = 12_000;

/** The athlete is in the middle of something, or the screen is still filling in. */
function isScreenBusy(): boolean {
  if (document.visibilityState !== 'visible') return true;
  if (document.querySelector(OPEN_OVERLAY_SELECTOR)) return true;
  // Skeletons are pulsing <div>s; a pulsing icon is decoration and does not count.
  if (document.querySelector('#outlet div.animate-pulse, #outlet [aria-busy="true"]')) return true;
  const focused = document.activeElement;
  return focused instanceof HTMLElement && (focused.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName));
}

/**
 * Introduces each screen the first time an account opens it.
 *
 * Renders nothing: it watches the route, waits until the screen has loaded and
 * nothing is layered on top, then hands the matching tour to Intro.js. A tour
 * counts as seen once it closes, whether finished or skipped.
 */
export function TourHost() {
  const { pathname, search } = useLocation();
  const { user } = useUser();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    const tour = findTourForRoute(pathname, search);
    if (!tour || !areToursEnabled(uid) || hasSeenTour(uid, tour)) return;

    let cancelled = false;
    let timer = 0;
    let lastCount = -1;
    let stablePolls = 0;
    const giveUpAt = performance.now() + GIVE_UP_MS;

    const poll = () => {
      if (cancelled || performance.now() > giveUpAt) return;

      const count = isScreenBusy() ? -1 : countTourTargets(tour);
      stablePolls = count > 0 && count === lastCount ? stablePolls + 1 : 0;
      lastCount = count;

      if (stablePolls >= STABLE_POLLS) {
        void startTour(tour, {
          isCancelled: () => cancelled,
          onClose: () => markTourSeen(uid, tour),
        });
        return;
      }
      timer = window.setTimeout(poll, POLL_MS);
    };

    timer = window.setTimeout(poll, SETTLE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      // Leaving the screen (deep link, notification) takes its tour along.
      exitActiveTour();
    };
  }, [pathname, search, uid]);

  return null;
}
