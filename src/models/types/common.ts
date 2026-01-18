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

export interface RunningSession {
  id: string;
  date: string;
  distance: number;
  duration: number;
  avgPace: number;
  notes?: string;
  ownerId: string;
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

export interface Habit {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  frequency: 'daily' | 'weekly';
  targetDaysPerWeek?: number;
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
