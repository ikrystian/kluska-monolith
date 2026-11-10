import type { ReactNode } from 'react';

/**
 * Names a region for a first-run tour step (see `lib/tours/tours.ts`) when the
 * thing to point at is a component that takes no extra props. Collapses when
 * the component renders nothing, so it never leaves a gap in a stacked layout,
 * and the step that points at it is skipped.
 */
export function TourAnchor({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div data-tour={name} className="empty:hidden">
      {children}
    </div>
  );
}
