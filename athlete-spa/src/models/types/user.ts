// User-related types
import { TrainingPlan, Workout } from './workout';

export type Gender = 'male' | 'female' | 'other';
export type TrainingLevelType = 'beginner' | 'intermediate' | 'advanced';

export interface TrainerCard {
  published?: boolean;
  headline?: string;
  bio?: string;
  coverImageUrl?: string;
  specializations?: string[];
  experienceYears?: number;
  languages?: string[];
  cooperationMode?: 'gym' | 'online' | 'both';
  certifications?: { name: string; year?: number }[];
  services?: { title: string; description?: string; price?: string; highlighted?: boolean }[];
  gallery?: string[];
  testimonials?: { author: string; text: string }[];
  ctaText?: string;
  /** Whether the trainer is taking on new athletes. */
  availability?: 'open' | 'limited' | 'closed';
  /** Typical time to first reply. */
  responseTime?: 'hour' | 'day' | 'few_days';
  /** Short bullet-point accomplishments, e.g. "120+ przemian". */
  achievements?: string[];
  faq?: { question: string; answer: string }[];
}

/** Server-computed numbers shown on a trainer's public profile. */
export interface TrainerPublicStats {
  athletesCount: number;
  plansCount: number;
  memberSince: string;
}

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
  /** Marketing profile shown to athletes on the trainer's detail page. */
  trainerCard?: TrainerCard;
  // Onboarding fields
  onboardingCompleted?: boolean;
  gender?: Gender;
  dateOfBirth?: string;
  height?: number;
  weight?: number;
  trainingLevel?: TrainingLevelType;
  // Strava integration
  /** Set by the API in place of the Strava tokens, which never leave the server. */
  stravaConnected?: boolean;
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