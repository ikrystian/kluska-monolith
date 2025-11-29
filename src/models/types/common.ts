// Common types used across the application
import { Timestamp } from 'mongodb';

export interface Article {
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
  deadline: Timestamp;
  ownerId: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: Timestamp;
  photoURLs: string[];
  ownerId: string;
}

export interface RunningSession {
  id: string;
  date: Timestamp;
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
  createdAt: Timestamp;
}

export interface BodyMeasurement {
  id: string;
  ownerId: string;
  date: Timestamp;
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
    createdAt: Timestamp;
  } | null;
  updatedAt: Timestamp;
  unreadCount?: {
    [userId: string]: number;
  };
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
}