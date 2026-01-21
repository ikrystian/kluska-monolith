import { SetType, WorkoutSet } from '@/lib/types';

export interface SetTemplate {
    id: string;
    name: string;
    description: string;
    sets: Omit<WorkoutSet, 'number' | 'completed'>[];
}

export const SET_TEMPLATES: SetTemplate[] = [
    {
        id: 'strength-5x5',
        name: '5x5 Siła',
        description: 'Klasyczny schemat siłowy - 5 serii po 5 powtórzeń',
        sets: [
            { type: SetType.WarmUpSet, reps: 10, weight: 0, restTimeSeconds: 60 },
            { type: SetType.WarmUpSet, reps: 5, weight: 0, restTimeSeconds: 90 },
            { type: SetType.WorkingSet, reps: 5, weight: 0, restTimeSeconds: 180 },
            { type: SetType.WorkingSet, reps: 5, weight: 0, restTimeSeconds: 180 },
            { type: SetType.WorkingSet, reps: 5, weight: 0, restTimeSeconds: 180 },
            { type: SetType.WorkingSet, reps: 5, weight: 0, restTimeSeconds: 180 },
            { type: SetType.WorkingSet, reps: 5, weight: 0, restTimeSeconds: 180 },
        ],
    },
    {
        id: 'hypertrophy-4x10',
        name: '4x10 Hipertrofia',
        description: 'Schemat na masę - 4 serie po 10 powtórzeń',
        sets: [
            { type: SetType.WarmUpSet, reps: 15, weight: 0, restTimeSeconds: 60 },
            { type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 90 },
            { type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 90 },
            { type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 90 },
            { type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 90 },
        ],
    },
    {
        id: 'pyramid',
        name: 'Piramida',
        description: 'Rosnący ciężar, malejące powtórzenia',
        sets: [
            { type: SetType.WarmUpSet, reps: 12, weight: 0, restTimeSeconds: 60 },
            { type: SetType.WorkingSet, reps: 10, weight: 0, restTimeSeconds: 90 },
            { type: SetType.WorkingSet, reps: 8, weight: 0, restTimeSeconds: 120 },
            { type: SetType.WorkingSet, reps: 6, weight: 0, restTimeSeconds: 150 },
            { type: SetType.WorkingSet, reps: 4, weight: 0, restTimeSeconds: 180 },
        ],
    },
    {
        id: 'dropset',
        name: 'Drop Set',
        description: 'Seria z obniżaniem ciężaru',
        sets: [
            { type: SetType.WarmUpSet, reps: 12, weight: 0, restTimeSeconds: 60 },
            { type: SetType.WorkingSet, reps: 8, weight: 0, restTimeSeconds: 120 },
            { type: SetType.DropSet, reps: 10, weight: 0, restTimeSeconds: 0 },
            { type: SetType.DropSet, reps: 12, weight: 0, restTimeSeconds: 0 },
            { type: SetType.DropSet, reps: 15, weight: 0, restTimeSeconds: 120 },
        ],
    },
];
