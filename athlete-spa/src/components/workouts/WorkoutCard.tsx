import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Dumbbell,
  Layers,
  MoreVertical,
  Play,
  Calendar,
  Edit,
  Copy,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { Workout, WorkoutLog } from '@/lib/types';
import { exerciseCount, levelColor, levelLabel, totalSets } from './workout-format';
import {
  FOCUS_META,
  templateCover,
  templateFocus,
  lastSessionOf,
  relativeDay,
} from '@/components/workout/template-meta';
import { TemplatePreviewSheet } from '@/components/workout/TemplateCards';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { haptic } from '@/lib/haptics';

export interface WorkoutCardProps {
  workout: Workout;
  to?: string;
  view?: 'grid' | 'list';
  logs?: WorkoutLog[] | null;
  onStart?: (workout: Workout) => void;
  onSchedule?: (workout: Workout) => void;
  onDuplicate?: (workout: Workout) => void;
  onDelete?: (workout: Workout) => void;
  isOwner?: boolean;
  className?: string;
}

/** 3-dots action menu with stopPropagation to avoid opening the preview sheet. */
export function WorkoutActionMenu({
  workout,
  isOwner,
  onStart,
  onSchedule,
  onDuplicate,
  onDelete,
  className,
}: {
  workout: Workout;
  isOwner?: boolean;
  onStart?: (w: Workout) => void;
  onSchedule?: (w: Workout) => void;
  onDuplicate?: (w: Workout) => void;
  onDelete?: (w: Workout) => void;
  className?: string;
}) {
  return (
    <div
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={className}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Więcej opcji"
            className="grid h-8 w-8 place-items-center rounded-full bg-black/45 text-white/90 backdrop-blur-md transition-colors hover:bg-black/70 hover:text-white active:scale-95"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" onClick={e => e.stopPropagation()}>
          {onStart && (
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation();
                haptic('tap');
                onStart(workout);
              }}
              className="gap-2 font-medium"
            >
              <Play className="h-4 w-4 fill-primary text-primary" />
              Rozpocznij trening
            </DropdownMenuItem>
          )}
          {onSchedule && (
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation();
                haptic('tap');
                onSchedule(workout);
              }}
              className="gap-2"
            >
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Zaplanuj w kalendarzu
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link to={`/athlete/workouts/${workout.id}`} className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              Pełne szczegóły
            </Link>
          </DropdownMenuItem>
          {isOwner && (
            <DropdownMenuItem asChild>
              <Link to={`/athlete/workouts/${workout.id}/edit`} className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-muted-foreground" />
                Edytuj szablon
              </Link>
            </DropdownMenuItem>
          )}
          {onDuplicate && (
            <DropdownMenuItem
              onClick={e => {
                e.stopPropagation();
                haptic('tap');
                onDuplicate(workout);
              }}
              className="gap-2"
            >
              <Copy className="h-4 w-4 text-muted-foreground" />
              Duplikuj szablon
            </DropdownMenuItem>
          )}
          {isOwner && onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={e => {
                  e.stopPropagation();
                  haptic('tap');
                  onDelete(workout);
                }}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Usuń szablon
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** Visual Grid Tile with cover illustration/photo, focus indicator, badges, and quick start. */
export function WorkoutGridCard({
  workout,
  logs,
  onStart,
  onSchedule,
  onDuplicate,
  onDelete,
  isOwner,
  className,
}: WorkoutCardProps) {
  const focus = templateFocus(workout.exerciseSeries);
  const meta = FOCUS_META[focus];
  const coverUrl = templateCover(workout);
  const sets = totalSets(workout.exerciseSeries);
  const exCount = workout.exerciseSeries?.length ?? 0;
  const last = lastSessionOf(workout, logs);
  const color = levelColor(workout.level);
  const preview = (workout.exerciseSeries ?? []).slice(0, 2).map(s => s.exercise?.name).filter(Boolean);

  const startAction = () => {
    if (onStart) {
      haptic('tap');
      onStart(workout);
    }
  };

  const cardContent = (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card text-left transition-all duration-200 hover:border-border hover:shadow-lg active:scale-[0.98]',
        className
      )}
    >
      {/* Cover with overlays */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/60">
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          className="h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-black/35 to-black/50" />

        {/* Top Badges */}
        <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
            {meta.label}
          </span>
          {isOwner && (
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black backdrop-blur-sm">
              Mój
            </span>
          )}
        </div>

        {/* Top Right Action Menu */}
        <WorkoutActionMenu
          workout={workout}
          isOwner={isOwner}
          onStart={onStart}
          onSchedule={onSchedule}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          className="absolute right-2.5 top-2.5"
        />

        {/* Bottom Cover Metrics */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-semibold text-white/90">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 tabular-nums backdrop-blur-sm">
            <Clock className="h-3 w-3 text-white/70" />
            {workout.durationMinutes > 0 ? `${workout.durationMinutes} min` : '–'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-0.5 tabular-nums backdrop-blur-sm">
            <Layers className="h-3 w-3 text-white/70" />
            {sets} {sets === 1 ? 'seria' : sets > 1 && sets < 5 ? 'serie' : 'serii'}
          </span>
        </div>
      </div>

      {/* Card Info */}
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-xl font-bold uppercase tracking-tight text-foreground transition-colors group-hover:text-primary">
            {workout.name}
          </h3>
        </div>

        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
          <span>{levelLabel(workout.level)}</span>
          <span>·</span>
          <span>{exerciseCount(exCount)}</span>
        </p>

        {preview.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {preview.map((p, i) => (
              <span
                key={i}
                className="inline-block max-w-[12rem] truncate rounded-md bg-secondary/80 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
              >
                {p}
              </span>
            ))}
            {exCount > preview.length && (
              <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                +{exCount - preview.length}
              </span>
            )}
          </div>
        )}

        {/* Footer with last session and quick start */}
        <div className="mt-3.5 flex items-center justify-between border-t border-border/40 pt-2.5">
          <span className="truncate text-[11px] font-medium text-muted-foreground/80">
            {last ? `Ostatnio ${relativeDay(new Date(last.endTime))}` : 'Jeszcze nie robiony'}
          </span>

          <div
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <Button
              type="button"
              size="sm"
              onClick={startAction}
              disabled={exCount === 0}
              className="h-8 gap-1.5 rounded-full px-3 text-xs font-bold"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> Trenuj
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <TemplatePreviewSheet
      template={workout}
      trigger={cardContent}
      onStart={startAction}
      lastSession={last}
    />
  );
}

/** Dense List Row with cover thumbnail, full meta, and right-hand actions. */
export function WorkoutListRow({
  workout,
  logs,
  onStart,
  onSchedule,
  onDuplicate,
  onDelete,
  isOwner,
  className,
}: WorkoutCardProps) {
  const focus = templateFocus(workout.exerciseSeries);
  const meta = FOCUS_META[focus];
  const coverUrl = templateCover(workout);
  const sets = totalSets(workout.exerciseSeries);
  const exCount = workout.exerciseSeries?.length ?? 0;
  const last = lastSessionOf(workout, logs);
  const color = levelColor(workout.level);
  const preview = (workout.exerciseSeries ?? []).slice(0, 3).map(s => s.exercise?.name).filter(Boolean);

  const startAction = () => {
    if (onStart) {
      haptic('tap');
      onStart(workout);
    }
  };

  const rowContent = (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'group relative flex items-center gap-3.5 rounded-2xl border border-border/40 bg-card p-3 text-left transition-colors hover:border-border hover:bg-secondary/40 active:bg-secondary/60',
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary/60">
        <img
          src={coverUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span
          className="absolute bottom-1 left-1 h-2 w-2 rounded-full ring-2 ring-background"
          style={{ backgroundColor: meta.accent }}
          title={meta.label}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <span className="font-bold text-foreground">{meta.label}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {levelLabel(workout.level)}
          </span>
          <span>·</span>
          <span>{workout.durationMinutes} min</span>
          {isOwner && (
            <span className="rounded bg-primary/15 px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              Mój
            </span>
          )}
        </div>

        <h3 className="truncate font-display text-xl font-bold uppercase leading-tight text-foreground transition-colors group-hover:text-primary">
          {workout.name}
        </h3>

        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {preview.length > 0 ? preview.join(' · ') : `${exerciseCount(exCount)} · ${sets} serii`}
        </p>

        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
          {last ? `Ostatnio ${relativeDay(new Date(last.endTime))}` : 'Jeszcze nie robiony'}
        </p>
      </div>

      {/* Trailing actions */}
      <div
        className="flex shrink-0 items-center gap-1"
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={startAction}
          disabled={exCount === 0}
          aria-label="Rozpocznij trening"
          className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-90 disabled:opacity-50"
        >
          <Play className="h-4 w-4 fill-current pl-0.5" />
        </button>

        <WorkoutActionMenu
          workout={workout}
          isOwner={isOwner}
          onStart={onStart}
          onSchedule={onSchedule}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </div>
  );

  return (
    <TemplatePreviewSheet
      template={workout}
      trigger={rowContent}
      onStart={startAction}
      lastSession={last}
    />
  );
}

/** Universal WorkoutCard supporting both Grid and List modes. */
export function WorkoutCard({
  workout,
  to,
  view = 'grid',
  logs,
  onStart,
  onSchedule,
  onDuplicate,
  onDelete,
  isOwner,
  className,
}: WorkoutCardProps) {
  if (view === 'list') {
    return (
      <WorkoutListRow
        workout={workout}
        to={to}
        logs={logs}
        onStart={onStart}
        onSchedule={onSchedule}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        isOwner={isOwner}
        className={className}
      />
    );
  }

  return (
    <WorkoutGridCard
      workout={workout}
      to={to}
      logs={logs}
      onStart={onStart}
      onSchedule={onSchedule}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      isOwner={isOwner}
      className={className}
    />
  );
}
