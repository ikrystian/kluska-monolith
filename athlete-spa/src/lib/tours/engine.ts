import { haptic } from '@/lib/haptics';
import type { TourDef, TourStepDef } from './types';

/**
 * Thin layer over Intro.js (https://introjs.com) that adapts it to this app:
 *
 *  - the library and its stylesheet are loaded on demand, so nobody who has
 *    already seen the tours pays for them;
 *  - the app scrolls inside `#outlet`, not the window, so bringing a step into
 *    view is done here instead of by Intro.js;
 *  - steps point at `data-tour` attributes and are re-resolved on every step,
 *    because a background revalidation can replace the node Intro.js holds.
 */

type IntroTour = ReturnType<(typeof import('intro.js'))['default']['tour']>;

const SCROLLER = '#outlet';
/** Set on <html> while a tour runs; globals pin the header and tab bar with it. */
const ACTIVE_ATTR = 'data-tour-active';

let activeTour: IntroTour | null = null;

export function isTourActive(): boolean {
  return activeTour !== null;
}

/** Closes the running tour, if any. Returns whether there was one (the Android back button asks). */
export function exitActiveTour(): boolean {
  if (!activeTour) return false;
  void activeTour.exit(true);
  return true;
}

/**
 * The element a step points at, provided it is actually laid out. When several
 * share the name (one per list row), the first one inside the viewport wins.
 */
export function findTourTarget(name: string): HTMLElement | null {
  let fallback: HTMLElement | null = null;
  for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight) return el;
    fallback ??= el;
  }
  return fallback;
}

/** How many of a tour's spotlight steps could be shown right now. */
export function countTourTargets(tour: TourDef): number {
  return tour.steps.filter(step => step.target && findTourTarget(step.target)).length;
}

/** A painted frame, or 60 ms when the page is in the background and frames are not being produced. */
const nextFrame = () =>
  new Promise<void>(resolve => {
    const timer = window.setTimeout(resolve, 60);
    requestAnimationFrame(() => {
      window.clearTimeout(timer);
      resolve();
    });
  });

/**
 * Scrolls a step's element into the part of the screen that is not covered by
 * the header and tab bar, leaving the larger share of the room for the card.
 */
async function reveal(el: HTMLElement) {
  const scroller = el.closest<HTMLElement>(SCROLLER);
  if (!scroller) return; // Header and tab bar are fixed: always in view.

  const view = scroller.getBoundingClientRect();
  // Something parked off to the side of a chip row: bring it in without moving the page.
  const side = el.getBoundingClientRect();
  if (side.left < view.left || side.right > view.right) {
    el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
  }

  const style = getComputedStyle(scroller);
  const top = view.top + parseFloat(style.paddingTop);
  const bottom = view.bottom - parseFloat(style.paddingBottom);
  const rect = el.getBoundingClientRect();
  const offset = Math.max(12, (bottom - top - rect.height) * 0.3);
  scroller.scrollTop += rect.top - (top + offset);

  await nextFrame();
  await nextFrame();
}

function toIntroStep(step: TourStepDef) {
  return {
    title: step.title,
    intro: step.body,
    element: step.target ? findTourTarget(step.target) : undefined,
    ...(step.position ? { position: step.position } : {}),
  };
}

/**
 * Runs a tour. Resolves to `false` when it could not start (another one is
 * running, the caller moved on while the library loaded, or none of the
 * elements it explains is on screen); `onClose` fires once it is over, however
 * it ended.
 */
export async function startTour(
  tour: TourDef,
  { isCancelled, onClose }: { isCancelled: () => boolean; onClose: () => void }
): Promise<boolean> {
  if (activeTour) return false;

  const [{ default: introJs }] = await Promise.all([import('intro.js'), import('./tour.css')]);
  if (activeTour || isCancelled()) return false;

  // Only what is on screen: the same tour serves guests, trainers and empty states.
  const steps = tour.steps.filter(step => !step.target || findTourTarget(step.target));
  if (!steps.some(step => step.target)) return false;

  const intro = introJs.tour().setOptions({
    steps: steps.map(toIntroStep),
    nextLabel: 'Dalej',
    prevLabel: 'Wstecz',
    doneLabel: steps.length > 1 ? 'Zaczynamy' : 'Jasne',
    skipLabel: 'Pomiń',
    hidePrev: true,
    showBullets: false,
    showProgress: steps.length > 1,
    showStepNumbers: steps.length > 1,
    stepNumbersOfLabel: 'z',
    // Scrolling is ours (see `reveal`), and a stray tap must not end the tour.
    scrollToElement: false,
    exitOnOverlayClick: false,
    disableInteraction: true,
    helperElementPadding: 8,
    tooltipClass: 'app-tour',
    highlightClass: 'app-tour-highlight',
  });

  let closed = false;
  let refreshQueued = false;
  const refresh = () => {
    if (refreshQueued || closed) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      if (!closed) intro.refresh();
    });
  };

  // Late images and revalidated lists move things under the spotlight.
  const content = document.querySelector(SCROLLER)?.firstElementChild;
  const resizeObserver = content ? new ResizeObserver(refresh) : null;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    activeTour = null;
    document.documentElement.removeAttribute(ACTIVE_ATTR);
    document.removeEventListener('scroll', refresh, true);
    resizeObserver?.disconnect();
    // Back to the top: where the screen starts, and where the chrome is shown.
    document.querySelector(SCROLLER)?.scrollTo({ top: 0 });
    onClose();
  };

  intro.onBeforeChange(async function (_element, previous, direction) {
    const index = previous === undefined ? 0 : direction === 'forward' ? previous + 1 : previous - 1;
    const def = steps[index];
    if (!def?.target) return true;

    const step = intro.getStep(index);
    let el = step.element instanceof HTMLElement ? step.element : null;
    if (!el?.isConnected) {
      el = findTourTarget(def.target);
      if (el) step.element = el;
    }
    if (el) await reveal(el);
    return true;
  });
  intro.onAfterChange(() => {
    if (intro.getCurrentStep()) haptic('tap');
  });
  intro.onExit(cleanup);

  activeTour = intro;
  document.documentElement.setAttribute(ACTIVE_ATTR, '');
  document.addEventListener('scroll', refresh, { capture: true, passive: true });
  if (content) resizeObserver?.observe(content);

  try {
    await intro.start();
  } catch {
    cleanup();
    return false;
  }
  return true;
}
