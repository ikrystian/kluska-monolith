// Common types used across the application

export interface Article {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  createdAt: string;
  updatedAt?: string;
  status: 'published' | 'draft';
  coverImageUrl?: string;
  imageHint?: string;
}

export interface ArticleCategory {
  id: string;
  name: string;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  ownerId: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
  photoURLs: string[];
  ownerId: string;
}

export interface RunningTrackPoint {
  lat: number;
  lng: number;
  /** Epoch ms when the fix was taken. */
  at: number;
  /** Altitude in metres, when the device/provider reports one. */
  alt?: number;
}

export interface RunningSession {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgPace: number;
  notes?: string;
  ownerId: string;
  /** Encoded route from the in-app GPS tracker; absent for manually entered runs. */
  polyline?: string;
  /** Raw per-second GPS samples backing `polyline`. */
  points?: RunningTrackPoint[];
  /** Training selected for this run, if any. */
  programId?: string;
  /** Snapshot of the program's name at run time. */
  programName?: string;
}

export type RunningCueTrigger = 'time' | 'distance';

export interface RunningCue {
  triggerType: RunningCueTrigger;
  /** Seconds of moving time (triggerType 'time') or metres covered (triggerType 'distance'). */
  value: number;
  audioUrl: string;
  label?: string;
}

export interface RunningProgram {
  id: string;
  name: string;
  targetDistanceKm: number;
  description?: string;
  isActive: boolean;
  cues: RunningCue[];
}

export interface TrainerRequest {
  id: string;
  athleteId: string;
  athleteName: string;
  trainerId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface BodyMeasurement {
  id: string;
  ownerId: string;
  date: string;
  weight: number;
  circumferences: {
    biceps?: number;
    chest?: number;
    waist?: number;
    hips?: number;
    thigh?: number;
  };
  photoURLs?: string[];
  sharedWithTrainer: boolean;
}

export interface Gym {
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
  ratingCount?: number;
  phoneNumber?: string;
  website?: string;
  cid?: string;
  photoUrls?: string[];
}

export interface Conversation {
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
    createdAt: string;
  } | null;
  updatedAt: string;
  unreadCount?: {
    [userId: string]: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export type FrequencyType = 'daily' | 'specific_days' | 'every_x_days';

export interface HabitFrequency {
  type: FrequencyType;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
  repeatEvery?: number; // For every_x_days
}

export interface Habit {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  icon?: string; // Emoji icon
  color?: string;
  frequency: HabitFrequency;
  duration?: number; // Optional goal in days
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  ownerId: string;
  date: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ChallengeStatus = 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

export interface Challenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerAvatarUrl?: string;
  challengedId: string;
  challengedName: string;
  challengedAvatarUrl?: string;
  targetKm: number;
  startDate?: string;
  endDate: string;
  status: ChallengeStatus;
  challengerProgress: number;
  challengedProgress: number;
  winnerId?: string;
  createdAt: string;
  updatedAt: string;
}

