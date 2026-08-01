import { forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Spinner badge that follows the pull gesture.
 *
 * Position and opacity are written by usePullToRefresh straight to the DOM, so
 * this renders once and never re-renders during the drag; `data-armed` and
 * `data-spinning` carry the visual state instead of props.
 *
 * It parks just above the content area, hidden behind the higher z-index
 * header, until the gesture translates it down into view.
 */
export const PullToRefreshIndicator = forwardRef<HTMLDivElement>(function PullToRefreshIndicator(_, ref) {
  return (
    <div
      ref={ref}
      aria-hidden
      style={{ opacity: 0, transform: 'translateY(0px)' }}
      className="group pointer-events-none absolute inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-20 -mt-12 flex justify-center md:hidden"
    >
      <span
        className={cn(
          'grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-card shadow-lifted',
          'transition-colors duration-200 group-data-[armed=true]:border-primary/50 group-data-[armed=true]:text-primary'
        )}
      >
        <RefreshCw className="h-4 w-4 text-current group-data-[spinning=true]:animate-spin" />
      </span>
    </div>
  );
});
