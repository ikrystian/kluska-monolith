import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import { useCollection, useDeleteDoc, useUser } from '@/lib/db-hooks';
import { useToast } from '@/hooks/use-toast';
import type { BodyMeasurement } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { AddMeasurementSheet } from '@/components/measurements/AddMeasurementSheet';
import { MeasurementHero } from '@/components/measurements/MeasurementHero';
import { MeasurementHistory } from '@/components/measurements/MeasurementHistory';
import { MetricTiles } from '@/components/measurements/MetricTiles';
import { PhotoComparison } from '@/components/measurements/PhotoComparison';
import { ProgressChart } from '@/components/measurements/ProgressChart';
import { seriesOf, type MetricKey } from '@/components/measurements/measurement-utils';
import { TourAnchor } from '@/components/tour/TourAnchor';

export default function MeasurementsPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { deleteDoc } = useDeleteDoc();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [metric, setMetric] = useState<MetricKey>('weight');
  const chartRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // "+" shortcuts land here with ?add=1 and go straight to the form.
  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    setSheetOpen(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const { data, isLoading, refetch } = useCollection<BodyMeasurement>(
    user ? 'bodyMeasurements' : null,
    { ownerId: user?.uid },
    { sort: { date: -1 } }
  );

  const loading = isUserLoading || isLoading;
  const measurements = useMemo(() => (isUserLoading ? [] : data ?? []), [data, isUserLoading]);
  const weights = useMemo(() => seriesOf(measurements, 'weight'), [measurements]);

  const selectMetric = (key: MetricKey) => {
    setMetric(key);
    chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const remove = async (measurement: BodyMeasurement) => {
    try {
      await deleteDoc('bodyMeasurements', measurement.id);
      toast({ title: 'Pomiar usunięty' });
      refetch();
    } catch {
      toast({ title: 'Nie udało się usunąć pomiaru', variant: 'destructive' });
    }
  };

  return (
    <div className="page space-y-4">
      <TourAnchor name="measurements-hero">
        <MeasurementHero weights={weights} isLoading={loading} onAdd={() => setSheetOpen(true)} />
      </TourAnchor>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-[1.4rem]" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      ) : measurements.length > 0 ? (
        <>
          <TourAnchor name="measurements-tiles">
            <MetricTiles measurements={measurements} selected={metric} onSelect={selectMetric} />
          </TourAnchor>

          <div ref={chartRef} className="scroll-mt-24">
            <ProgressChart measurements={measurements} metric={metric} onMetricChange={setMetric} />
          </div>

          <TourAnchor name="measurements-photos">
            <PhotoComparison measurements={measurements} />
          </TourAnchor>

          <MeasurementHistory measurements={measurements} onDelete={remove} />
        </>
      ) : null}

      <Link
        to="/athlete/check-in"
        className="flex items-center gap-3 rounded-2xl bg-card p-4 transition-colors hover:bg-secondary/50 active:scale-[0.99]"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">Cotygodniowy check-in</span>
          <span className="block text-xs text-muted-foreground">Pomiary możesz też dodać razem z oceną tygodnia.</span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>

      {user && (
        <AddMeasurementSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          ownerId={user.uid}
          measurements={measurements}
          onSaved={refetch}
        />
      )}
    </div>
  );
}
