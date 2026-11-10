import useSWR from 'swr';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Clock, Dumbbell } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api-client';
import { jsonFetcher } from '@/lib/db-hooks';

interface GymWorkout {
  id: string;
  workoutName: string;
  endTime?: string;
  durationMin?: number;
  exerciseCount: number;
  exerciseNames: string[];
  photoUrl?: string;
  user?: { userId: string; displayName: string; avatarUrl?: string };
}

/** Latest workouts logged at this gym by athletes, with their photos when they added one. */
export function GymRecentWorkouts({ gymId }: { gymId: string }) {
  const { data, isLoading } = useSWR<{ data: GymWorkout[] }>(
    gymId ? `/api/gyms/${gymId}/recent-workouts` : null,
    jsonFetcher
  );
  const workouts = data?.data ?? [];

  if (isLoading) return <div className="h-16 animate-pulse rounded-xl bg-muted" />;
  if (workouts.length === 0) return null;

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Ostatnie treningi</p>
      <ul className="space-y-2">
        {workouts.map(workout => (
          <li key={workout.id} className="flex gap-3 rounded-xl bg-secondary/60 p-2.5">
            <Avatar name={workout.user?.displayName} url={workout.user?.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">
                {workout.user?.displayName ?? 'Sportowiec'}
                <span className="font-normal text-muted-foreground"> · {workout.workoutName}</span>
              </p>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {workout.endTime && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(workout.endTime), 'd MMM, HH:mm', { locale: pl })}
                  </span>
                )}
                {workout.durationMin ? <span>{workout.durationMin} min</span> : null}
                <span className="inline-flex items-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  {workout.exerciseCount} ćw.
                </span>
              </p>
              {workout.exerciseNames.length > 0 && (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{workout.exerciseNames.join(', ')}</p>
              )}
            </div>
            {workout.photoUrl && (
              <a href={resolveMediaUrl(workout.photoUrl)} target="_blank" rel="noopener noreferrer" className="shrink-0">
                <img
                  src={resolveMediaUrl(workout.photoUrl)}
                  alt={`Zdjęcie z treningu: ${workout.workoutName}`}
                  loading="lazy"
                  className="h-14 w-14 rounded-lg object-cover"
                />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Avatar({ name, url }: { name?: string; url?: string }) {
  if (url) {
    return <img src={resolveMediaUrl(url)} alt={name ?? ''} className="h-9 w-9 shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
      {(name ?? 'S').charAt(0).toUpperCase()}
    </div>
  );
}
