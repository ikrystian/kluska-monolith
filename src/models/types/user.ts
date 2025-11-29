// User-related types
import { TrainingPlan, Workout } from './workout';

export interface UserProfile {
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
}

export interface AthleteProfile extends UserProfile {
  role: 'athlete';
  trainerId: string;
  currentPlan?: TrainingPlan;
  completedWorkouts?: {
    date: Date;
    workout: Workout;
    actualDurationMinutes?: number;
  }[];
}