// User-related types
import { TrainingPlan, Workout } from './workout';

export type Gender = 'male' | 'female' | 'other';
export type TrainingLevelType = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'athlete' | 'trainer' | 'admin';
  avatarUrl?: string;
  location?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  trainerId?: string;
  favoriteGymIds?: string[];
  // Onboarding fields
  onboardingCompleted?: boolean;
  gender?: Gender;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  trainingLevel?: TrainingLevelType;
  // Strava integration
  stravaAccessToken?: string;
  stravaRefreshToken?: string;
  stravaTokenExpiresAt?: string;
  stravaAthleteId?: string;
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

// Onboarding data type
export interface OnboardingData {
  name: string;
  gender: Gender;
  dateOfBirth: string;
  height: number;
  weight: number;
  trainingLevel: TrainingLevelType;
}