import { Link } from 'react-router-dom';
import { ChevronRight, Clock, Dumbbell, Layers } from 'lucide-react';
import type { Workout } from '@/lib/types';
import { cn } from '@/lib/utils';
import { tint } from '@/components/profile/profile-ui';
import { exerciseCount, levelColor, levelLabel, totalSets } from './workout-format';

/** Workout tile: cover image with level + owner chips, key numbers underneath. */
export function WorkoutCard({ workout, to }: { workout: Workout; to: string }) {
  const color = levelColor(workout.level);
  const isPublic = workout.ownerId === 'public';
  const sets = totalSets(workout.exerciseSeries);
  const preview = (workout.exerciseSeries ?? []).slice(0, 3).map(s => s.exercise.name);
  const more = (workout.exerciseSeries?.length ?? 0) - preview.length;

  return (
    <Link
      to={to}
      className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-border/60 bg-card shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.985]"
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-secondary/40">
        {workout.imageUrl ? (
          <img
            src={workout.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="hero-ember absolute inset-0 grid place-items-center">
            <Dumbbell className="h-12 w-12 text-white/30" />
          </div>
        )}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span
          className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md"
          style={{ color }}
        >
          {levelLabel(workout.level)}
        </span>
        <span
          className={cn(
            'absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md',
            isPublic ? 'bg-background/85 text-muted-foreground' : 'bg-primary text-primary-foreground'
          )}
        >
          {isPublic ? 'Publiczny' : 'Mój'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 font-headline text-lg font-bold leading-snug">{workout.name}</h2>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        {preview.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {preview.join(' · ')}
            {more > 0 && ` · +${more}`}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 text-xs font-semibold tabular-nums">
          <Chip icon={Clock} color={color}>{workout.durationMinutes} min</Chip>
          <Chip icon={Dumbbell} color={color}>{exerciseCount(workout.exerciseSeries?.length ?? 0)}</Chip>
          {sets > 0 && <Chip icon={Layers} color={color}>{sets} serii</Chip>}
        </div>
      </div>
    </Link>
  );
}

function Chip({
  icon: Icon,
  color,
  children,
}: {
  icon: typeof Clock;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ backgroundColor: tint(color, 12) }}
    >
      <Icon className="h-3.5 w-3.5" style={{ color }} />
      {children}
    </span>
  );
}
