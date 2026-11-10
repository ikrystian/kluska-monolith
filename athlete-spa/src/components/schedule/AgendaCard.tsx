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

/** Day agenda row: time, type and what it is. Details open in a sheet. */
export function AgendaCard({ event, onOpen }: { event: AgendaEvent; onOpen: () => void }) {
    const color = KIND_COLOR[event.kind];
    const Icon = KIND_ICON[event.kind];
    const { title, stats } = describe(event);

    return (
        <li>
            <button
                type="button"
                onClick={onOpen}
                className="row-tap flex w-full min-w-0 items-center gap-3 rounded-2xl bg-card px-3.5 py-3 text-left"
            >
                <span className="w-11 shrink-0 font-display text-[1.375rem] font-bold leading-none tabular-nums">{format(event.date, 'HH:mm')}</span>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: tint(color, 15), color }}>
                    <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold leading-tight">{title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                        {KIND_LABEL[event.kind]} · {stats.filter(Boolean).join(' · ')}
                    </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
            </button>
        </li>
    );
}
