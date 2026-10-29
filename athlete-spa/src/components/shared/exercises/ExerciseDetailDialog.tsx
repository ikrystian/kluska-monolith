'use client';

import { Exercise } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/api-client';
import { useIsMobile } from '@/hooks/use-mobile';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Dumbbell, Edit, LineChart as ChartIcon, Target } from 'lucide-react';
import { exerciseTypeMeta, getMainMuscleNames, isVideoUrl } from './ExerciseCardParts';

interface ExerciseDetailDialogProps {
    exercise: Exercise | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Pokazuje przycisk "Zobacz postęp" w stopce */
    onShowProgress?: (exercise: Exercise) => void;
    /** Pokazuje przycisk "Edytuj" w stopce */
    onEdit?: (exercise: Exercise) => void;
}

/**
 * Zwraca lokalny URL animacji ćwiczenia (zapisany podczas importu openGym
 * w `setup` jako grupa "Animacja"), gdy istnieje.
 */
function getAnimationUrl(exercise: Exercise | null): string | undefined {
    if (!exercise?.setup) return undefined;
    const item = exercise.setup.find((s) => s.group === 'Animacja' && s.value);
    return item?.value;
}

function getYouTubeEmbedUrl(url: string) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? `https://www.youtube.com/embed/${match[2]}` : null;
}

/** Dzieli instrukcje na kroki (po liniach), usuwając numerację/punktory z początku. */
function splitSteps(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*(?:\d+[.)]|[-•*])\s*/, '').trim())
        .filter(Boolean);
}

function ExerciseMedia({ exercise }: { exercise: Exercise }) {
    // Animacja (z importu openGym) ma pierwszeństwo nad obrazkiem w szczegółach.
    const animationUrl = getAnimationUrl(exercise);
    const mediaUrl = resolveMediaUrl(animationUrl || exercise.mediaUrl || exercise.image || '');
    const posterUrl = resolveMediaUrl(exercise.image || exercise.mediaUrl || '');

    if (!mediaUrl) {
        return (
            <div className="flex aspect-video w-full items-center justify-center bg-gradient-to-br from-muted to-secondary">
                <Dumbbell className="h-14 w-14 text-muted-foreground/30" />
            </div>
        );
    }

    if (isVideoUrl(mediaUrl)) {
        const youtubeEmbedUrl = getYouTubeEmbedUrl(mediaUrl);
        return (
            <div className="relative aspect-video w-full bg-black">
                {youtubeEmbedUrl ? (
                    <iframe
                        src={youtubeEmbedUrl}
                        title={exercise.name}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <video
                        src={mediaUrl}
                        className="h-full w-full object-contain"
                        controls={!animationUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        poster={posterUrl || undefined}
                    >
                        <source src={mediaUrl} />
                    </video>
                )}
            </div>
        );
    }

    return (
        <div className="relative aspect-video w-full bg-muted">
            <img src={mediaUrl} alt={exercise.name} className="absolute inset-0 h-full w-full object-contain" />
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{children}</h3>
    );
}

function ExerciseDetailBody({ exercise }: { exercise: Exercise }) {
    const mainMuscles = getMainMuscleNames(exercise);
    const secondaryMuscles = exercise.secondaryMuscleGroups?.map((mg) => mg.name) ?? [];
    const setup = exercise.setup?.filter((item) => item.group !== 'Animacja' && item.group && item.value) ?? [];
    const instructions = exercise.instructions || exercise.description || '';
    const steps = splitSteps(instructions);

    return (
        <div className="space-y-6">
            {/* Partie mięśniowe */}
            {(mainMuscles.length > 0 || secondaryMuscles.length > 0) && (
                <section>
                    <SectionTitle>Partie mięśniowe</SectionTitle>
                    <div className="space-y-2.5">
                        {mainMuscles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="w-20 flex-shrink-0 text-xs text-muted-foreground">Główne</span>
                                {mainMuscles.map((name) => (
                                    <span
                                        key={name}
                                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
                                    >
                                        <Target className="h-3 w-3" />
                                        {name}
                                    </span>
                                ))}
                            </div>
                        )}
                        {secondaryMuscles.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="w-20 flex-shrink-0 text-xs text-muted-foreground">Pomocnicze</span>
                                {secondaryMuscles.map((name) => (
                                    <span
                                        key={name}
                                        className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
                                    >
                                        {name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Konfiguracja (pary group/value z bazy) */}
            {setup.length > 0 && (
                <section>
                    <SectionTitle>Konfiguracja</SectionTitle>
                    <dl className="divide-y divide-border/60 overflow-hidden rounded-2xl border bg-card">
                        {setup.map((item, idx) => (
                            <div key={idx} className="flex gap-3 px-4 py-2.5 text-sm">
                                <dt className="w-28 flex-shrink-0 font-medium text-muted-foreground">{item.group}</dt>
                                <dd className="min-w-0 flex-1 whitespace-pre-wrap">{item.value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}

            {/* Instrukcje */}
            <section>
                <SectionTitle>Instrukcje</SectionTitle>
                {steps.length > 1 ? (
                    <ol className="space-y-3">
                        {steps.map((step, idx) => (
                            <li key={idx} className="flex gap-3 text-sm leading-relaxed">
                                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {idx + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                            </li>
                        ))}
                    </ol>
                ) : (
                    <p className="whitespace-pre-wrap rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">
                        {instructions || 'Brak instrukcji dla tego ćwiczenia.'}
                    </p>
                )}
            </section>
        </div>
    );
}

export function ExerciseDetailDialog({
    exercise,
    open,
    onOpenChange,
    onShowProgress,
    onEdit,
}: ExerciseDetailDialogProps) {
    const isMobile = useIsMobile();

    if (!exercise) return null;

    const typeMeta = exercise.type ? exerciseTypeMeta[exercise.type] : null;
    const hasActions = !!onShowProgress || !!onEdit;

    const header = (Title: typeof DialogTitle, Description: typeof DialogDescription) => (
        <div className="space-y-1.5 px-5 pt-5 text-left">
            {typeMeta && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    <typeMeta.icon className="h-3 w-3" />
                    {typeMeta.label}
                </span>
            )}
            <Title className="font-headline text-2xl font-bold leading-tight">{exercise.name}</Title>
            <Description className="sr-only">Szczegółowe informacje o ćwiczeniu</Description>
        </div>
    );

    const actions = hasActions && (
        <div className="flex shrink-0 gap-2 border-t border-border/60 bg-background/90 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur md:pb-4">
            {onEdit && (
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => onEdit(exercise)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edytuj
                </Button>
            )}
            {onShowProgress && (
                <Button className="flex-1 rounded-full" onClick={() => onShowProgress(exercise)}>
                    <ChartIcon className="mr-2 h-4 w-4" />
                    Zobacz postęp
                </Button>
            )}
        </div>
    );

    const scrollBody = (
        <div className="min-h-0 flex-1 overflow-y-auto">
            <ExerciseMedia exercise={exercise} />
            {/* Typy Title/Description z sheet i dialog są zgodne (Radix Dialog pod spodem) */}
            {isMobile ? header(SheetTitle, SheetDescription) : header(DialogTitle, DialogDescription)}
            <div className="px-5 pb-6 pt-5">
                <ExerciseDetailBody exercise={exercise} />
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="bottom"
                    className="mx-auto flex max-h-[92dvh] w-full flex-col gap-0 overflow-hidden rounded-t-[2rem] p-0 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-background/80 [&>button]:p-1.5 [&>button]:backdrop-blur"
                >
                    <div className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-white/70 shadow" />
                    {scrollBody}
                    {actions}
                </SheetContent>
            </Sheet>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:rounded-3xl [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-background/80 [&>button]:p-1.5 [&>button]:backdrop-blur">
                {scrollBody}
                {actions}
            </DialogContent>
        </Dialog>
    );
}
