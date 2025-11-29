'use client';

import { Timestamp } from "mongodb";

// --- Enums from data.ts ---
export enum MuscleGroupName {
  Back = 'Plecy',
  Biceps = 'Biceps',
  Calves = 'Łydki',
  Chest = 'Klata',
  Core = 'Core',
  Forearms = 'Przedramiona',
  FullBody = 'Full Body',
  Glutes = 'Pośladki',
  Hamstrings = '',
  LowerBack = 'Lower Back',
  Quads = 'Quads',
  RearDelts = 'Rear Delts',
  Shoulders = 'Shoulders',
  AnteriorTibialis = 'Anterior Tibialis',
  Traps = 'Traps',
  Triceps = 'Triceps',
  Adductors = 'Adductors',
  Hips = 'Hips',
  Abductors = 'Abductors'
}

export enum TrainingLevel {
  Beginner = 'beginner',
  Intermediate = 'intermediate',
  Advanced = 'advanced'
}

export enum SetType {
  BackOffSet = 'Back-off set',
  WorkingSet = 'Working set',
  WarmUpSet = 'Warm-up set',
  DropSet = 'Drop set',
  FailureSet = 'Failure set'
}

// --- Interfaces from data.ts ---

export interface MuscleGroup {
  name: MuscleGroupName;
  imageUrl?: string;
}

export interface Exercise {
  id: string; // Keeping ID for DB compatibility
  name: string;
  mainMuscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  instructions?: string;
  mediaUrl?: string; // Image or Video URL
  // Legacy fields kept optional for backward compatibility if needed, or to be removed
  muscleGroup?: string;
  description?: string;
  image?: string;
  imageHint?: string;
  ownerId?: string;
  type?: 'weight' | 'duration' | 'reps'; // Keeping this for logic in UI if needed, or we derive from data
}

export interface WorkoutSet {
  number: number;
  type: SetType;
  reps: number;
  weight: number;
  restTimeSeconds: number;
  completed?: boolean; // Added for tracking state
  duration?: number; // Added to support duration-based sets if needed
}

export interface ExerciseSeries {
  exercise: Exercise;
  tempo: string; // e.g., "3-0-1-0"
  tip?: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string; // Keeping ID for DB compatibility
  name: string;
  imageUrl?: string;
  level: TrainingLevel;
  durationMinutes: number;
  exerciseSeries: ExerciseSeries[];
  ownerId?: string; // Added for ownership
  description?: string; // Added for UI
}

export type DayPlan = Workout | 'Rest Day';

export interface TrainingWeek {
  // Array of 7 days, index 0 = Monday, etc.
  days: [DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan, DayPlan];
}

export interface TrainingStage {
  name: string;
  weeks: TrainingWeek[];
}

export interface TrainingPlan {
  id: string; // Keeping ID for DB compatibility
  name: string;
  level: TrainingLevel;
  description?: string;
  stages: TrainingStage[];
  trainerId?: string; // Added for ownership
  assignedAthleteIds?: string[]; // Added for assignment
}

// --- Existing Types (Updated where necessary) ---

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'trainer' | 'admin';
  location?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  trainerId?: string;
  favoriteGymIds?: string[];
};

export type Article = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  status: 'published' | 'draft';
  coverImageUrl?: string;
  imageHint?: string;
};

export type ArticleCategory = {
  id: string;
  name: string;
};

// Updated to match ExerciseSeries structure
export type WorkoutExerciseLog = ExerciseSeries;

export type WorkoutLog = {
  id: string;
  endTime: Timestamp;
  workoutName: string;
  duration?: number; // in minutes
  exercises: WorkoutExerciseLog[]; // Now using ExerciseSeries
  photoURL?: string;
  athleteId: string;
  status?: 'in-progress' | 'completed';
  startTime?: Timestamp;
  feedback?: string;
};

export type Goal = {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: Timestamp;
  ownerId: string;
};

export type AiWorkoutPlan = {
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
};

export type WorkoutDayExercise = {
  exerciseId: string;
  sets: {
    reps?: number;
    weight?: number;
    duration?: number;
    completed?: boolean;
  }[];
  duration?: number; // Duration in seconds for time-based exercises
};

export type WorkoutDay = {
  dayName: string;
  exercises: WorkoutDayExercise[];
};

// Keeping WorkoutPlan for now as it might be different from TrainingPlan in the DB
// But we should aim to replace it with TrainingPlan
export type WorkoutPlan = {
  id: string;
  name: string;
  description: string;
  trainerId: string; // Also ownerId
  assignedAthleteIds: string[];
  workoutDays: WorkoutDay[];
};

export type PlannedWorkout = {
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
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  date: Timestamp;
  photoURLs: string[];
  ownerId: string;
};

export type RunningSession = {
  id: string;
  date: Timestamp;
  distance: number; // in km
  duration: number; // in minutes
  avgPace: number; // in min/km
  notes?: string;
  ownerId: string;
};

export type FoodItem = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export type Meal = {
  id: string;
  ownerId: string;
  date: Timestamp;
  type: MealType;
  foodItems: FoodItem[];
};

export type LoggedMeal = {
  id: string;
  ownerId: string;
  date: Timestamp;
  type: MealType;
  foodItems: FoodItem[];
};

export type TrainerRequest = {
  id: string;
  athleteId: string;
  athleteName: string;
  trainerId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
};

export type BodyMeasurement = {
  id: string;
  ownerId: string;
  date: Timestamp;
  weight: number; // in kg
  circumferences: {
    biceps?: number; // in cm
    chest?: number; // in cm
    waist?: number; // in cm
    hips?: number; // in cm
    thigh?: number; // in cm
  };
  photoURLs?: string[];
  sharedWithTrainer: boolean;
};

export type Gym = {
  id: string;
  name: string;
  address: string;
  location?: {
    lat: number;
    lng: number;
  };
  description?: string;
  amenities?: string[];
  rating?: number;
  photoUrls?: string[];
};

export type Conversation = {
  id: string;
  conversationId: string;
  participants: string[];
  trainerId: string;
  athleteId: string;
  trainerName: string;
  athleteName: string;
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: Timestamp;
  } | null;
  updatedAt: Timestamp;
  unreadCount?: {
    [userId: string]: number;
  };
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
};

export interface AthleteProfile extends UserProfile {
  role: 'athlete';
  trainerId: string;
  currentPlan?: TrainingPlan; // Added to match data.ts User structure
  completedWorkouts?: { // Added to match data.ts User structure
    date: Date;
    workout: Workout;
    actualDurationMinutes?: number;
  }[];
}

export interface DietPlan {
  id: string;
  name: string;
  description?: string;
  trainerId: string;
  days: {
    dayNumber: number;
    meals: Meal[];
  }[];
  createdAt: Timestamp;
}


