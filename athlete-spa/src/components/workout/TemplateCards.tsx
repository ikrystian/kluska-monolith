import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Clock3, Layers, ListOrdered, Play, Plus, Sparkles } from 'lucide-react';
import type { ExerciseSeries, Workout, WorkoutLog, WorkoutSet } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { exercisesLabel } from '@/lib/plural';
import { cn } from '@/lib/utils';
import {
  FOCUS_META,
  lastSessionOf,
  relativeDay,
  templateAreaLabels,
  templateFocus,
  totalSetCount,
} from './template-meta';

// --- EXERCISE LIST ------------------------------------------------------------
// Short "what's inside" list shown before the athlete commits to a training,
// so they can peek at the exercises without entering the builder first.

const summarizeSets = (sets: WorkoutSet[] | undefined): string | null => {
  if (!sets || sets.length === 0) return null;
  const count = sets.length;
  const reps = sets.map(s => Number(s.reps)).filter(r => Number.isFinite(r) && r > 0);
  const durations = sets.map(s => Number(s.duration)).filter(d => Number.isFinite(d) && d > 0);

  let detail = '';
  if (reps.length) {
    const min = Math.min(...reps);
    const max = Math.max(...reps);
    detail = ` × ${min === max ? min : `${min}-${max}`}`;
  } else if (durations.length) {
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    detail = ` × ${min === max ? `${min}s` : `${min}-${max}s`}`;
  }
  return `${count} ${count === 1 ? 'seria' : 'serii'}${detail}`;
};

export function WorkoutExercisesPreview({ exerciseSeries }: { exerciseSeries: ExerciseSeries[] | undefined }) {
  if (!exerciseSeries || exerciseSeries.length === 0) {
    return <p className="rounded-2xl bg-secondary/60 p-4 text-center text-sm text-muted-foreground">Ten trening nie ma jeszcze żadnych ćwiczeń.</p>;
  }

  return (
    <ol className="divide-y divide-border/50">
      {exerciseSeries.map((series, i) => {
        const muscles = series.exercise?.mainMuscleGroups?.map(mg => mg.name).filter(Boolean).join(', ');
        const summary = summarizeSets(series.sets);
        const meta = [summary, muscles].filter(Boolean).join(' · ');
        return (
          <li key={i} className="flex items-center gap-3 py-2.5">
            <span className="w-5 shrink-0 text-center font-display text-xl font-bold tabular-nums text-muted-foreground">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight">{series.exercise?.name || 'Nieznane ćwiczenie'}</p>
              <p className="truncate text-xs text-muted-foreground">{meta || 'Ogólnorozwojowe'}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// --- COVER ----------------------------------------------------------------------

/** Template artwork: its own photo when the coach set one, else the illustration for its focus. */
export function TemplateCover({ workout, className, children }: { workout: Pick<Workout, 'imageUrl' | 'exerciseSeries'>; className?: string; children?: ReactNode }) {
  const focus = templateFocus(workout.exerciseSeries);
  const src = workout.imageUrl || FOCUS_META[focus].cover;
  return (
    <div className={cn('relative overflow-hidden bg-[#111316]', className)}>
      <img src={src} alt="" loading="lazy" decoding="async" draggable={false} className="absolute inset-0 h-full w-full select-none object-cover" />
      {children}
    </div>
  );
}

function FocusBadge({ workout, className }: { workout: Pick<Workout, 'exerciseSeries'>; className?: string }) {
  const meta = FOCUS_META[templateFocus(workout.exerciseSeries)];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-white backdrop-blur-sm', className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.accent }} />
      {meta.label}
    </span>
  );
}

// --- PREVIEW SHEET ----------------------------------------------------------------

function Stat({ icon: Icon, value, label }: { icon: typeof Clock3; value: ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-secondary/70 px-3 py-2.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-1.5 font-display text-2xl font-bold leading-none tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

/** Full look at a template — cover, size, exercises — with the start button under the thumb. */
export function TemplatePreviewSheet({ template, trigger, onStart, lastSession }: { template: Workout; trigger: ReactNode; onStart: () => void; lastSession?: WorkoutLog | null }) {
  const areas = templateAreaLabels(template.exerciseSeries);
  const sets = totalSetCount(template.exerciseSeries);
  const description = template.description || (areas.length ? areas.join(' · ') : 'Trening ogólnorozwojowy');

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col gap-0 px-0 pt-0">
        <TemplateCover workout={template} className="h-44 shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-popover via-popover/20 to-transparent" />
        </TemplateCover>
        <div className="relative -mt-12 shrink-0 px-5">
          <FocusBadge workout={template} />
          <SheetTitle className="mt-2 font-display text-[2.25rem] font-bold uppercase leading-[0.95]">{template.name}</SheetTitle>
          <SheetDescription className="mt-1 line-clamp-2">{description}</SheetDescription>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Stat icon={Clock3} value={template.durationMinutes || '–'} label="minut" />
            <Stat icon={ListOrdered} value={template.exerciseSeries?.length ?? 0} label="ćwiczeń" />
            <Stat icon={Layers} value={sets} label="serii" />
          </div>
          {lastSession && (
            <p className="mt-2.5 text-xs text-muted-foreground">
              Ostatnio robiony {relativeDay(new Date(lastSession.endTime))}
            </p>
          )}
        </div>
        <div className="no-scrollbar mt-2 min-h-0 flex-1 overflow-y-auto px-5">
          <WorkoutExercisesPreview exerciseSeries={template.exerciseSeries} />
        </div>
        <div className="flex shrink-0 gap-2 px-5 pt-3">
          <Button asChild variant="secondary" size="lg" className="px-5">
            <Link to={`/athlete/workouts/${template.id}`}>Szczegóły</Link>
          </Button>
          <SheetClose asChild>
            <Button onClick={onStart} size="lg" className="flex-1" disabled={(template.exerciseSeries?.length ?? 0) === 0}>
              <Play className="fill-current" /> Rozpocznij
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- CARDS --------------------------------------------------------------------------

/** "Na dziś": the recommended template, big, with a one-tap start. */
export function FeaturedTemplate({ template, reason, onStart, lastSession }: { template: Workout; reason: string; onStart: () => void; lastSession?: WorkoutLog | null }) {
  const count = template.exerciseSeries?.length ?? 0;
  const sets = totalSetCount(template.exerciseSeries);
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#111316] text-white">
      <TemplateCover workout={template} className="h-[16.5rem]">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/0" />
      </TemplateCover>
      <div className="absolute left-3.5 top-3.5 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-primary-foreground">
          <Sparkles className="h-3 w-3" /> Na dziś
        </span>
        <FocusBadge workout={template} className="py-1" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="truncate text-xs font-semibold text-white/70">{reason}</p>
        <h2 className="mt-0.5 line-clamp-2 font-display text-[2.5rem] font-bold uppercase leading-[0.92]">{template.name}</h2>
        <p className="mt-1.5 truncate text-[13px] text-white/75">
          {template.durationMinutes ? `${template.durationMinutes} min · ` : ''}
          {exercisesLabel(count)}
          {sets > 0 ? ` · ${sets} serii` : ''}
        </p>
        <div className="mt-3 flex gap-2">
          <Button onClick={onStart} className="flex-1">
            <Play className="fill-current" /> Rozpocznij
          </Button>
          <TemplatePreviewSheet
            template={template}
            onStart={onStart}
            lastSession={lastSession}
            trigger={
              <Button variant="secondary" className="bg-white/15 px-4 text-white backdrop-blur-md active:bg-white/25">
                Podgląd
              </Button>
            }
          />
        </div>
      </div>
    </section>
  );
}

/** Grid tile: cover on top, name and size underneath. Opens the preview sheet. */
export function TemplateTile({ template, logs, onStart }: { template: Workout; logs: WorkoutLog[] | null | undefined; onStart: () => void }) {
  const last = lastSessionOf(template, logs);
  const count = template.exerciseSeries?.length ?? 0;
  const isOwn = Boolean(template.ownerId && template.ownerId !== 'public');

  return (
    <TemplatePreviewSheet
      template={template}
      onStart={onStart}
      lastSession={last}
      trigger={
        <button type="button" className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card text-left transition-transform duration-150 active:scale-[0.97]">
          <TemplateCover workout={template} className="aspect-[4/3] w-full">
            <FocusBadge workout={template} className="absolute left-2 top-2" />
            {isOwn && (
              <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] text-black">Mój</span>
            )}
            {template.durationMinutes > 0 && (
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-[3px] text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm">
                <Clock3 className="h-3 w-3" /> {template.durationMinutes} min
              </span>
            )}
          </TemplateCover>
          <span className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
            <span className="line-clamp-2 font-display text-[1.3125rem] font-bold uppercase leading-[1.02]">{template.name}</span>
            <span className="mt-auto block pt-1 text-xs text-muted-foreground">{exercisesLabel(count)}</span>
            <span className="block truncate text-[11px] font-semibold text-muted-foreground/80">
              {last ? `Ostatnio ${relativeDay(new Date(last.endTime))}` : 'Jeszcze nie robiony'}
            </span>
          </span>
        </button>
      }
    />
  );
}

/** Last tile in the grid: make a new template. */
export function NewTemplateTile() {
  return (
    <Link
      to="/athlete/workouts/create"
      className="flex min-h-[13rem] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 text-center text-muted-foreground transition-colors active:bg-secondary"
    >
      <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-foreground">
        <Plus className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-bold uppercase leading-none text-foreground">Nowy szablon</span>
      <span className="text-xs">Zapisz swój stały trening</span>
    </Link>
  );
}
