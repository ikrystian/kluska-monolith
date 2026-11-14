import { useSyncExternalStore } from 'react';

/**
 * Two-pane layout starts at the unfolded Galaxy Z Fold (673–690 CSS px wide
 * depending on the generation). The height floor keeps phones held in
 * landscape on the single-column layout: they are wide enough, but two panes
 * that short would be useless.
 */
const TABLET_QUERY = '(min-width: 672px) and (min-height: 480px)';

function subscribe(onChange: () => void) {
  const media = window.matchMedia(TABLET_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** `true` on tablets and unfolded foldables; follows folding and rotation live. */
export function useIsTablet(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(TABLET_QUERY).matches,
    () => false
  );
}
