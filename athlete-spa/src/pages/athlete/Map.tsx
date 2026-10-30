import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// mapbox-gl is heavy and only this screen uses it.
const GymMap = lazy(() => import('@/components/GymMap'));

export default function MapPage() {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col gap-4 px-4 pb-24 pt-18 md:px-6 md:pb-6 md:pt-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Trening</p>
        <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">Mapa siłowni</h1>
      </header>
      <div className="min-h-0 flex-1">
        <Suspense fallback={<Skeleton className="h-full w-full rounded-[2rem]" />}>
          <GymMap />
        </Suspense>
      </div>
    </div>
  );
}
