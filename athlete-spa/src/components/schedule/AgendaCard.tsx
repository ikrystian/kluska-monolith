import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, ChevronRight, Dumbbell, Footprints, type LucideIcon } from 'lucide-react';
import { tint } from '@/components/profile/profile-ui';
import { exercisesLabel, getLoggedWorkoutStats } from './WorkoutExerciseList';
import { KIND_COLOR, KIND_LABEL, formatRunPace, type AgendaEvent } from './agenda';

const KIND_ICON: Record<AgendaEvent['kind'], LucideIcon> = {
    trainer: Dumbbell,
    completed: CheckCircle2,
    planned: CalendarClock,
    run: Footprints,
};

function describe(event: AgendaEvent): { title: string; stats: string[] } {
    switch (event.kind) {
        case 'trainer':
            return {
                title: event.session.title,
                stats: [`${event.session.duration} min`, event.session.trainerName],
            };
        case 'completed': {
            const s = getLoggedWorkoutStats(event.log.exercises);
            return {
                title: event.log.workoutName,
                stats: [
                    `${s.exerciseCount} ${exercisesLabel(s.exerciseCount)}`,
                    s.volume > 0 ? `${s.volume.toLocaleString('pl-PL')} kg` : '',
                    event.log.duration ? `${event.log.duration} min` : '',
                ],
            };
        }
        case 'planned': {
            const n = event.plan.exercises?.length ?? 0;
            return { title: event.plan.workoutName, stats: [`${n} ${exercisesLabel(n)}`] };
        }
        case 'run':
            return {
                title: event.run.title,
                stats: [`${event.run.distanceKm.toFixed(2)} km`, `${event.run.durationMin.toFixed(0)} min`, formatRunPace(event.run.avgPace)],
            };
    }
}

/** Day agenda row: time on the left, one tappable card — details open in a sheet. */
export function AgendaCard({ event, onOpen }: { event: AgendaEvent; onOpen: () => void }) {
    const color = KIND_COLOR[event.kind];
    const Icon = KIND_ICON[event.kind];
    const { title, stats } = describe(event);

    return (
        <li className="flex gap-3">
            <div className="w-11 shrink-0 pt-4 text-right">
                <p className="font-display text-sm font-extrabold tabular-nums">{format(event.date, 'HH:mm')}</p>
            </div>
            <button
                type="button"
                onClick={onOpen}
                className="group relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-[1.25rem] border border-border/60 bg-card p-3 pl-4 text-left shadow-soft transition-transform active:scale-[0.985]"
            >
                <span aria-hidden className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: color }} />
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: tint(color, 15), color }}>
                    <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
                        {KIND_LABEL[event.kind]}
                    </span>
                    <span className="block truncate font-headline text-base font-bold leading-snug">{title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {stats.filter(Boolean).join(' · ')}
                    </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
        </li>
    );
}
