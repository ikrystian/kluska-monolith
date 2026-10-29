import { Loader2 } from 'lucide-react';

/**
 * Fallback shown while a lazily-loaded route/feature chunk is fetched.
 *
 * Kept intentionally tiny (no data hooks, no layout deps) so it lives in the
 * main bundle and paints instantly. The layout shell (nav/header/bottom-nav)
 * stays mounted around it — see the <Suspense> inside AnimatedOutlet.
 */
export function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center py-16">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Full-viewport variant for routes rendered outside the athlete layout. */
export function FullScreenFallback() {
  return (
    <div className="flex min-h-dvh w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
