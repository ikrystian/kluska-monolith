import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { addMinutes, format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ArrowRight, CheckCircle, MapPin, Play, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { tint } from '@/components/profile/profile-ui';
import {
    LoggedExerciseList,
    PlannedExerciseList,
    exercisesLabel,
    getLoggedWorkoutStats,
} from './WorkoutExerciseList';
import { KIND_COLOR, KIND_LABEL, formatRunPace, type AgendaEvent } from './agenda';

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
    return (
        <div className="rounded-2xl px-2 py-3 text-center" style={{ backgroundColor: tint(color, 10) }}>
            <p className="font-display text-xl font-extrabold leading-none tabular-nums">{value}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
    );
}

function Stats({ items, color }: { items: [string, string][]; color: string }) {
    return (
        <div className={items.length === 4 ? 'grid grid-cols-4 gap-2' : items.length === 2 ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-3 gap-2'}>
            {items.map(([value, label]) => (
                <Stat key={label} value={value} label={label} color={color} />
            ))}
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
            {children}
        </section>
    );
}

interface EventSheetProps {
    event: AgendaEvent | null;
    onOpenChange: (open: boolean) => void;
    /** Opens the trainer-session dialog (confirm / cancel flow). */
    onOpenSession: (event: Extract<AgendaEvent, { kind: 'trainer' }>) => void;
}

/** Bottom sheet with the full detail of one agenda entry — one scroll, actions pinned at the bottom. */
export function EventSheet({ event, onOpenChange, onOpenSession }: EventSheetProps) {
    const color = event ? KIND_COLOR[event.kind] : 'hsl(var(--primary))';

    let title = '';
    let body: ReactNode = null;
    let actions: ReactNode = null;

    if (event?.kind === 'completed') {
        const s = getLoggedWorkoutStats(event.log.exercises);
        title = event.log.workoutName;
        body = (
            <>
                <Stats
                    color={color}
                    items={[
                        [`${s.exerciseCount}`, exercisesLabel(s.exerciseCount)],
                        [`${s.setCount}`, 'Serii'],
                        [s.volume > 0 ? s.volume.toLocaleString('pl-PL') : '–', 'kg'],
                        [event.log.duration ? `${event.log.duration}` : '–', 'min'],
                    ]}
                />
                <Section title="Ćwiczenia">
                    <LoggedExerciseList exercises={event.log.exercises} scroll={false} />
                </Section>
            </>
        );
        actions = (
            <Button asChild className="h-12 w-full rounded-full text-base">
                <Link to={`/athlete/history/${event.log.id}`}>
                    Pełne podsumowanie <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        );
    } else if (event?.kind === 'planned') {
        const workoutId = (event.plan as { workoutId?: string }).workoutId;
        title = event.plan.workoutName;
        body = (
            <Section title={`Plan · ${event.plan.exercises?.length ?? 0} ${exercisesLabel(event.plan.exercises?.length ?? 0)}`}>
                <PlannedExerciseList exercises={event.plan.exercises} scroll={false} />
            </Section>
        );
        actions = workoutId ? (
            <div className="grid gap-2">
                <Button asChild className="h-12 w-full rounded-full text-base">
                    <Link to={`/athlete/log?workoutId=${workoutId}`}>
                        <Play className="mr-2 h-4 w-4 fill-current" /> Rozpocznij trening
                    </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 w-full rounded-full">
                    <Link to={`/athlete/workouts/${workoutId}`}>Szczegóły treningu</Link>
                </Button>
            </div>
        ) : null;
    } else if (event?.kind === 'trainer') {
        const { session } = event;
        title = session.title;
        body = (
            <>
                <dl className="divide-y divide-border/60 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card text-sm">
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <dt className="text-muted-foreground">Godzina</dt>
                        <dd className="font-semibold tabular-nums">
                            {format(event.date, 'HH:mm')} – {format(addMinutes(event.date, session.duration), 'HH:mm')}
                        </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <dt className="text-muted-foreground">Trener</dt>
                        <dd className="flex items-center gap-1.5 font-semibold">
                            <User className="h-4 w-4 text-primary" /> {session.trainerName}
                        </dd>
                    </div>
                    {session.location && (
                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                            <dt className="text-muted-foreground">Miejsce</dt>
                            <dd className="flex items-center gap-1.5 text-right font-semibold">
                                <MapPin className="h-4 w-4 shrink-0 text-primary" /> {session.location}
                            </dd>
                        </div>
                    )}
                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <dt className="text-muted-foreground">Status</dt>
                        <dd className="font-semibold">{session.status === 'confirmed' ? 'Potwierdzona' : 'Czeka na potwierdzenie'}</dd>
                    </div>
                </dl>
                {session.description && (
                    <Section title="Opis">
                        <p className="rounded-[1.25rem] bg-secondary/50 p-4 text-sm leading-relaxed text-muted-foreground">{session.description}</p>
                    </Section>
                )}
            </>
        );
        actions = (
            <div className="grid gap-2">
                {session.status === 'scheduled' && (
                    <Button className="h-12 w-full rounded-full text-base" onClick={() => onOpenSession(event)}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Potwierdź udział
                    </Button>
                )}
                <Button variant="outline" className="h-11 w-full rounded-full" onClick={() => onOpenSession(event)}>
                    Zarządzaj sesją
                </Button>
            </div>
        );
    } else if (event?.kind === 'run') {
        const { run } = event;
        title = run.title;
        body = (
            <Stats
                color={color}
                items={[
                    [run.distanceKm.toFixed(2), 'km'],
                    [run.durationMin.toFixed(0), 'min'],
                    [formatRunPace(run.avgPace), 'tempo'],
                ]}
            />
        );
        actions = run.isClickable ? (
            <Button asChild className="h-12 w-full rounded-full text-base">
                <Link to={run.href}>
                    Pełne podsumowanie <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        ) : null;
    }

    return (
        <Sheet open={!!event} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col gap-0 rounded-t-[2rem] p-0"
            >
                {event && (
                    <>
                        <SheetHeader className="shrink-0 space-y-1 px-5 pb-3 pt-6 text-left">
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
                                {KIND_LABEL[event.kind]}
                            </span>
                            <SheetTitle className="font-headline text-2xl leading-tight">{title}</SheetTitle>
                            <SheetDescription className="first-letter:uppercase">
                                {format(event.date, "EEEE, d MMMM · HH:mm", { locale: pl })}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4">{body}</div>

                        {actions && (
                            <div className="shrink-0 border-t border-border/60 bg-background/90 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
                                {actions}
                            </div>
                        )}
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
