import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// react-leaflet + leaflet are heavy and only this screen uses them.
const GymMap = lazy(() => import('@/components/GymMap'));

export default function MapPage() {
  return (
    <div className="container mx-auto p-4 md:p-8 h-[calc(100vh-4rem)]">
      <Suspense fallback={<Skeleton className="h-full w-full rounded-lg" />}>
        <GymMap />
      </Suspense>
    </div>
  );
}
