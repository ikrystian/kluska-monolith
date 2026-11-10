import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// mapbox-gl is heavy and only this screen uses it.
const GymMap = lazy(() => import('@/components/GymMap'));

export default function MapPage() {
  return (
    <div className="page flex h-full flex-col gap-4">
      <div className="min-h-0 flex-1">
        <Suspense fallback={<Skeleton className="h-full w-full rounded-2xl" />}>
          <GymMap />
        </Suspense>
      </div>
    </div>
  );
}
