// Exercise-related types
import { MuscleGroupName, SetType } from './enums';

export interface MuscleGroup {
  name: MuscleGroupName;
  imageUrl?: string;
}

export interface Exercise {
  id: string;
  name: string;
  mainMuscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  instructions?: string;
  mediaUrl?: string;
  // Legacy fields kept for backward compatibility
  muscleGroup?: string;
  description?: string;
  image?: string;
  imageHint?: string;
  ownerId?: string;
  type?: 'weight' | 'duration' | 'reps';
}

export interface WorkoutSet {
  number: number;
  type: SetType;
  reps?: number;
  weight?: number;
  duration?: number;
  restTimeSeconds: number;
  completed?: boolean;
}

export interface ExerciseSeries {
  exercise: Exercise;
  tempo: string;
  tip?: string;
  sets: WorkoutSet[];
}