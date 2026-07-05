// Social-related types
import { Timestamp } from 'mongodb';
import { PersonalRecord } from './workout';

export interface SocialProfile {
  id: string;
  ownerId: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface SocialPost {
  id: string;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  imageUrl: string;
  description?: string;
  likes: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface PublicProfileData {
  id: string;
  ownerId: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  role: 'athlete' | 'trainer' | 'admin';
  personalRecords: PersonalRecord[];
  totalWorkouts: number;
  memberSince: Timestamp;
}