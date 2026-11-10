import { SetType } from './types';
import {
  Flame,
  Target,
  TrendingDown,
  Layers,
  AlertTriangle,
  type LucideIcon
} from 'lucide-react';

export interface SetTypeConfig {
  type: SetType;
  name: string;
  shortName: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
}

export const SET_TYPE_CONFIG: Record<SetType, SetTypeConfig> = {
  [SetType.WarmUpSet]: {
    type: SetType.WarmUpSet,
    name: 'Seria rozgrzewkowa',
    shortName: 'Rozgrzewka',
    description: 'Lekka seria przygotowująca mięśnie i stawy do wysiłku. Używaj 40-60% docelowego ciężaru.',
    icon: Flame,
    colorClass: 'text-food',
    bgColorClass: 'bg-food/20',
    borderColorClass: 'border-food/30',
  },
  [SetType.WorkingSet]: {
    type: SetType.WorkingSet,
    name: 'Seria robocza',
    shortName: 'Robocza',
    description: 'Główna seria treningowa z docelowym obciążeniem. Tu budujesz siłę i masę mięśniową.',
    icon: Target,
    colorClass: 'text-run',
    bgColorClass: 'bg-run/20',
    borderColorClass: 'border-run/30',
  },
  [SetType.BackOffSet]: {
    type: SetType.BackOffSet,
    name: 'Seria back-off',
    shortName: 'Back-off',
    description: 'Seria z obniżonym ciężarem po seriach roboczych. Pozwala na dodatkową objętość bez nadmiernego zmęczenia.',
    icon: TrendingDown,
    colorClass: 'text-social',
    bgColorClass: 'bg-social/20',
    borderColorClass: 'border-social/30',
  },
  [SetType.DropSet]: {
    type: SetType.DropSet,
    name: 'Drop set',
    shortName: 'Drop',
    description: 'Seria z progresywnym obniżaniem ciężaru bez przerwy. Intensywna technika na pompę mięśniową.',
    icon: Layers,
    colorClass: 'text-primary',
    bgColorClass: 'bg-primary/20',
    borderColorClass: 'border-primary/30',
  },
  [SetType.FailureSet]: {
    type: SetType.FailureSet,
    name: 'Seria do odmowy',
    shortName: 'Do odmowy',
    description: 'Seria wykonywana do momentu niemożności wykonania kolejnego powtórzenia. Maksymalna intensywność.',
    icon: AlertTriangle,
    colorClass: 'text-destructive',
    bgColorClass: 'bg-destructive/20',
    borderColorClass: 'border-destructive/30',
  },
};

// Helper function to get config for a set type
export function getSetTypeConfig(type: SetType): SetTypeConfig {
  return SET_TYPE_CONFIG[type] || SET_TYPE_CONFIG[SetType.WorkingSet];
}

// Get all set types as array for iteration
export function getAllSetTypes(): SetTypeConfig[] {
  return Object.values(SET_TYPE_CONFIG);
}

// Exercise type configuration
export type ExerciseType = 'weight' | 'reps' | 'duration';

export interface ExerciseTypeConfig {
  type: ExerciseType;
  name: string;
  description: string;
  icon: LucideIcon;
  fields: ('weight' | 'reps' | 'duration')[];
  unit: string;
}

import { Dumbbell, Repeat, Timer } from 'lucide-react';

export const EXERCISE_TYPE_CONFIG: Record<ExerciseType, ExerciseTypeConfig> = {
  weight: {
    type: 'weight',
    name: 'Na ciężar',
    description: 'Ćwiczenie z obciążeniem zewnętrznym (sztanga, hantle, maszyna)',
    icon: Dumbbell,
    fields: ['weight', 'reps'],
    unit: 'kg',
  },
  reps: {
    type: 'reps',
    name: 'Na powtórzenia',
    description: 'Ćwiczenie z masą własnego ciała (pompki, podciąganie, dipy)',
    icon: Repeat,
    fields: ['reps'],
    unit: 'powt.',
  },
  duration: {
    type: 'duration',
    name: 'Na czas',
    description: 'Ćwiczenie mierzone czasem (plank, izometria, cardio)',
    icon: Timer,
    fields: ['duration'],
    unit: 'sek.',
  },
};

export function getExerciseTypeConfig(type: ExerciseType): ExerciseTypeConfig {
  return EXERCISE_TYPE_CONFIG[type] || EXERCISE_TYPE_CONFIG.weight;
}

export function getAllExerciseTypes(): ExerciseTypeConfig[] {
  return Object.values(EXERCISE_TYPE_CONFIG);
}