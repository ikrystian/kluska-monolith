import type { PlannedWorkout, WorkoutLog } from '@/lib/types';
import type { TrainingSessionData } from './SessionDetailsDialog';

export interface AgendaRun {
    id: string;
    date: Date;
    title: string;
    distanceKm: number;
    durationMin: number;
    avgPace: number;
    isClickable: boolean;
    href: string;
}

/** One entry of the day agenda; `kind` decides colour, card content and the detail sheet. */
export type AgendaEvent =
    | { kind: 'trainer'; id: string; date: Date; session: TrainingSessionData }
    | { kind: 'completed'; id: string; date: Date; log: WorkoutLog }
    | { kind: 'planned'; id: string; date: Date; plan: PlannedWorkout }
    | { kind: 'run'; id: string; date: Date; run: AgendaRun };

export const KIND_COLOR: Record<AgendaEvent['kind'], string> = {
    trainer: '#f97316',
    completed: '#8b5cf6',
    planned: '#3b82f6',
    run: '#0ea5e9',
};

export const KIND_LABEL: Record<AgendaEvent['kind'], string> = {
    trainer: 'Z trenerem',
    completed: 'Ukończony',
    planned: 'Zaplanowany',
    run: 'Bieg',
};

export const formatRunPace = (pace: number) => {
    if (!pace || !Number.isFinite(pace)) return `0'00"/km`;
    const paceMinutes = Math.floor(pace);
    const paceSeconds = Math.round((pace - paceMinutes) * 60);
    return `${paceMinutes}'${paceSeconds.toString().padStart(2, '0')}"/km`;
};
