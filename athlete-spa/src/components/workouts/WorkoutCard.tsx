import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Workout } from '@/lib/types';
import { exerciseCount, levelColor, levelLabel, totalSets } from './workout-format';

/** Template row: what it is, how big it is, and which exercises it opens with. */
export function WorkoutCard({ workout, to }: { workout: Workout; to: string }) {
  const color = levelColor(workout.level);
  const isPublic = workout.ownerId === 'public';
  const sets = totalSets(workout.exerciseSeries);
  const preview = (workout.exerciseSeries ?? []).slice(0, 3).map(s => s.exercise.name);
  const more = (workout.exerciseSeries?.length ?? 0) - preview.length;

  return (
    <Link to={to} className="row-tap flex items-center gap-3 rounded-2xl bg-card p-3.5">
      {workout.imageUrl && (
        <img src={workout.imageUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-2xl font-bold uppercase leading-none">{workout.name}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span className="truncate">
            {levelLabel(workout.level)} · {workout.durationMinutes} min · {exerciseCount(workout.exerciseSeries?.length ?? 0)}
            {sets > 0 ? ` · ${sets} serii` : ''}
            {isPublic ? ' · Publiczny' : ''}
          </span>
        </p>
        {preview.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {preview.join(' · ')}
            {more > 0 && ` · +${more}`}
          </p>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
    </Link>
  );
}
