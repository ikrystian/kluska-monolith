// Enums for the application

export enum MuscleGroupName {
  Back = 'Back',
  Biceps = 'Biceps',
  Calves = 'Calves',
  Chest = 'Chest',
  Core = 'Core',
  Forearms = 'Forearms',
  FullBody = 'Full Body',
  Glutes = 'Glutes',
  Hamstrings = 'Hamstrings',
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

// Exercise-related types

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

// Workout-related types

export interface Workout {
  id: string;
  name: string;
  imageUrl?: string;
  level: TrainingLevel;
  durationMinutes: number;
  exerciseSeries: ExerciseSeries[];
  ownerId?: string;
  description?: string;
  sourceWorkoutId?: string;
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

export type WorkoutExerciseLog = ExerciseSeries;

export interface PersonalRecord {
  id: string;
  athleteId: string;
  exerciseId: string;
  exerciseName: string;
  type: 'max_weight' | 'max_reps' | 'max_duration';
  value: number;
  reps?: number;
  achievedAt: string;
  workoutLogId: string;
}

export interface WorkoutLog {
  id: string;
  endTime: string;
  workoutName: string;
  duration?: number;
  exercises: WorkoutExerciseLog[];
  photoURL?: string;
  athleteId: string;
  status?: 'in-progress' | 'completed';
  startTime?: string;
  feedback?: string;
  newRecords?: PersonalRecord[];
  sourceWorkoutId?: string;
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
  date: string;
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

// User-related types

export type Gender = 'male' | 'female' | 'other';
export type TrainingLevelType = 'beginner' | 'intermediate' | 'advanced';
export type UserRole = 'athlete' | 'trainer' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  trainerId?: string;
  createdAt?: string;
  updatedAt?: string;
  // Athlete-specific fields
  age?: number;
  gender?: Gender;
  height?: number;
  weight?: number;
  trainingLevel?: TrainingLevelType;
  goals?: string[];
  onboardingCompleted?: boolean;
}

// Gamification types

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'workout' | 'streak' | 'social' | 'milestone';
  requirement: number;
  xpReward: number;
  unlockedAt?: string;
}

export interface GamificationProfile {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  achievements: Achievement[];
  badges: string[];
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  xp: number;
  level: number;
  rank: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  cost: number;
  type: 'badge' | 'title' | 'theme';
  claimed?: boolean;
}

// Chat types

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name?: string;
  }[];
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: string;
}

// Knowledge Zone types

export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  imageUrl?: string;
  category: string;
  tags: string[];
  authorId: string;
  authorName?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'published';
}

export interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

// Measurement types

export interface Measurement {
  id: string;
  userId: string;
  date: string;
  weight?: number;
  bodyFat?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  bicepLeft?: number;
  bicepRight?: number;
  thighLeft?: number;
  thighRight?: number;
  calfLeft?: number;
  calfRight?: number;
  notes?: string;
  createdAt: string;
}

// Alias for backward compatibility
export type BodyMeasurement = Measurement;

// Goal types

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  // Aliases for compatibility
  target?: number;
  current?: number;
  unit: string;
  type: 'weight' | 'strength' | 'endurance' | 'habit' | 'custom';
  deadline?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

// Habit types

export interface Habit {
  id: string;
  userId: string;
  ownerId?: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency: 'daily' | 'weekly' | 'custom';
  targetDays?: number[];
  streak: number;
  longestStreak: number;
  completedDates: string[];
  isActive?: boolean;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  ownerId: string;
  date: string;
  completed: boolean;
  createdAt?: string;
}

// Calendar types

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  type: 'workout' | 'rest' | 'measurement' | 'custom';
  date: string;
  startTime?: string;
  endTime?: string;
  completed: boolean;
  workoutId?: string;
  createdAt: string;
}

// Social types

export interface SocialPost {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  content: string;
  imageUrl?: string;
  workoutLogId?: string;
  likes: string[];
  comments: SocialComment[];
  createdAt: string;
}

export interface SocialComment {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  content: string;
  createdAt: string;
}

// Running types

export interface RunningSession {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  distance: number;
  duration: number;
  pace: number;
  calories?: number;
  route?: {
    lat: number;
    lng: number;
    timestamp: string;
  }[];
  status: 'in-progress' | 'completed' | 'paused';
  createdAt: string;
}

// Template types

export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: ExerciseSeries[];
  ownerId: string;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}
