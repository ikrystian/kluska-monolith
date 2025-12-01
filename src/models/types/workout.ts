// Workout-related types
import { Timestamp } from 'mongodb';
import { TrainingLevel } from './enums';
import { Exercise, ExerciseSeries } from './exercise';

export interface Workout {
  id: string;
  name: string;
  imageUrl?: string;
  level: TrainingLevel;
  durationMinutes: number;
  exerciseSeries: ExerciseSeries[];
  ownerId?: string;
  description?: string;
  sourceWorkoutId?: string; // Track the original workout when copied
  createdAt?: string;
  updatedAt?: string;
}

export type DayPlan = Workout | 'Rest Day';

export interface TrainingWeek {
  days: [DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan];
}

export interface TrainingStage {
  name: string;
  weeks: TrainingWeek[];
}

export interface TrainingPlan {
  id: string;
  name: string;
  level: TrainingLevel;
  description?: string;
  stages: TrainingStage[];
  trainerId?: string;
  assignedAthleteIds?: string[];
}

// Updated to match ExerciseSeries structure
export type WorkoutExerciseLog = ExerciseSeries;

export interface PersonalRecord {
  id: string;
  athleteId: string;
  exerciseId: string;
  exerciseName: string;
  type: 'max_weight' | 'max_reps' | 'max_duration';
  value: number;
  reps?: number;
  achievedAt: Timestamp;
  workoutLogId: string;
}

export interface WorkoutLog {
  id: string;
  endTime: Timestamp;
  workoutName: string;
  duration?: number;
  exercises: WorkoutExerciseLog[];
  photoURL?: string;
  athleteId: string;
  status?: 'in-progress' | 'completed';
  startTime?: Timestamp;
  feedback?: string;
  newRecords?: PersonalRecord[];
  sourceWorkoutId?: string; // Track the original workout template used
}

export interface WorkoutDayExercise {
  exerciseId: string;
  sets: {
    reps?: number;
    weight?: number;
    duration?: number;
    completed?: boolean;
  }[];
  duration?: number;
}

export interface WorkoutDay {
  dayName: string;
  exercises: WorkoutDayExercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  trainerId: string;
  assignedAthleteIds: string[];
  workoutDays: WorkoutDay[];
}

export interface PlannedWorkout {
  id: string;
  date: Timestamp;
  workoutName: string;
  exercises: {
    name: string;
    sets?: string;
    reps?: string;
    rest?: string;
    duration?: string;
  }[];
  ownerId: string;
}

export interface AiWorkoutPlan {
  id: string;
  planName: string;
  description: string;
  workoutDays: {
    day: string;
    name: string;
    exercises: {
      name: string;
      sets: string;
      reps: string;
      rest: string;
    }[];
  }[];
}