import { useMemo } from 'react';
import { differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import type { WorkoutLog } from '@/lib/types';

/** How the app's many muscle names map onto what an athlete actually plans around. */
const MUSCLE_AREAS: { label: string; muscles: string[] }[] = [
  { label: 'Klatka', muscles: ['Klatka piersiowa'] },
  { label: 'Plecy', muscles: ['Plecy', 'Kaptury', 'Dolny odcinek pleców'] },
  { label: 'Barki', muscles: ['Barki', 'Tylne aktony barków'] },
  { label: 'Ramiona', muscles: ['Biceps', 'Triceps', 'Przedramiona'] },
  { label: 'Nogi', muscles: ['Czworogłowe uda', 'Dwugłowe uda', 'Pośladki', 'Łydki', 'Przywodziciele', 'Odwodziciele', 'Biodra', 'Piszczele'] },
  { label: 'Brzuch', muscles: ['Brzuch'] },
];

/** A muscle group is usually ready to train hard again after about three days. */
const RECOVERY_HOURS = 72;

function lastTrained(logs: WorkoutLog[], muscles: string[]): Date | null {
  for (const log of logs) {
    const hit = log.exercises?.some(series => series.exercise?.mainMuscleGroups?.some(group => muscles.includes(group.name)));
    if (hit) return new Date(log.endTime);
  }
  return null;
}

/**
 * Which muscles are ready, worked out from the last few sessions. Answers the
 * question behind every "what should I train today?" without another screen.
 */
export function MuscleRecovery({ logs }: { logs: WorkoutLog[] }) {
  const areas = useMemo(() => {
    const now = new Date();
    return MUSCLE_AREAS.map(area => {
      const date = lastTrained(logs, area.muscles);
      const hours = date ? differenceInHours(now, date) : RECOVERY_HOURS;
      return { label: area.label, ready: Math.min(1, hours / RECOVERY_HOURS), hours, trained: Boolean(date) };
    });
  }, [logs]);

  if (logs.length === 0) return null;

  const fresh = areas.filter(area => area.ready >= 1).map(area => area.label.toLowerCase());

  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Regeneracja</h2>
        <p className="min-w-0 truncate text-[13px] text-muted-foreground">
          {fresh.length > 0 ? `Gotowe: ${fresh.slice(0, 3).join(', ')}` : 'Wszystko jeszcze odpoczywa'}
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-6 gap-1.5">
        {areas.map(area => (
          <li key={area.label} className="min-w-0 text-center">
            <div className="relative mx-auto h-12 w-full overflow-hidden rounded-lg bg-secondary">
              <div
                className={cn('absolute inset-x-0 bottom-0 transition-[height] duration-500', area.ready >= 1 ? 'bg-volt' : area.ready >= 0.5 ? 'bg-food' : 'bg-primary')}
                style={{ height: `${Math.max(8, area.ready * 100)}%` }}
              />
            </div>
            <p className="mt-1 truncate text-[11px] font-medium text-muted-foreground">{area.label}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
