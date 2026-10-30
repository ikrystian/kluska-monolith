import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
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

export default function MeasurementsPage() {
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const { deleteDoc } = useDeleteDoc();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [metric, setMetric] = useState<MetricKey>('weight');
  const chartRef = useRef<HTMLDivElement>(null);

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
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 pb-6 pt-18 md:px-6 md:pt-8">
      <header>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">Sylwetka</p>
        <h1 className="font-headline text-3xl font-bold tracking-tight md:text-4xl">Pomiary ciała</h1>
        <p className="mt-1 text-sm text-muted-foreground">Waga, obwody i zdjęcia — dowód, że plan działa.</p>
      </header>

      <MeasurementHero weights={weights} isLoading={loading} onAdd={() => setSheetOpen(true)} />

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-[1.4rem]" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-[1.75rem]" />
        </div>
      ) : measurements.length > 0 ? (
        <>
          <MetricTiles measurements={measurements} selected={metric} onSelect={selectMetric} />

          <div ref={chartRef} className="scroll-mt-24">
            <ProgressChart measurements={measurements} metric={metric} onMetricChange={setMetric} />
          </div>

          <PhotoComparison measurements={measurements} />

          <MeasurementHistory measurements={measurements} onDelete={remove} />
        </>
      ) : null}

      <Link
        to="/athlete/check-in"
        className="flex items-center gap-3 rounded-[1.5rem] border border-border/60 bg-card p-4 shadow-soft transition-colors hover:bg-secondary/50 active:scale-[0.99]"
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
