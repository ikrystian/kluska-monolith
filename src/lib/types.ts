'use client';

import type { Timestamp } from 'firebase/firestore';

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

export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  description: string;
  image: string;
  imageHint: string;
  ownerId?: string;
  type: 'weight' | 'duration' | 'reps';
};

export type WorkoutExerciseLog = {
  exerciseId: string;
  sets: {
    reps: number;
    weight?: number;
  }[];
  duration?: number; // Actual duration in seconds for time-based exercises
};

export type WorkoutLog = {
  id: string;
  endTime: Timestamp;
  workoutName: string;
  duration?: number; // in minutes
  exercises: WorkoutExerciseLog[];
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
    name:string;
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
    reps: number;
    weight?: number;
  }[];
  duration?: number; // Duration in seconds for time-based exercises
};

export type WorkoutDay = {
  dayName: string;
  exercises: WorkoutDayExercise[];
};

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

export type MuscleGroup = {
  id: string;
  name: string;
  imageUrl?: string;
  imageHint?: string;
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
}

