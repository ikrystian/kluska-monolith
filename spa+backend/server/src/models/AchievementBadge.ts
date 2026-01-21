import mongoose, { Schema, Model, Document } from 'mongoose';

export type AchievementCategory = 'consistency' | 'performance' | 'social' | 'milestone';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface IAchievementRequirement {
  type: 'streak' | 'goal_count' | 'workout_count' | 'points_earned' | 'level_reached' | 'custom';
  value: number;
  comparison: 'gte' | 'lte' | 'eq';
  customField?: string;
}

export interface IAchievementBadge extends Omit<Document, '_id'> {
  _id: mongoose.Types.ObjectId;
  name: string;
  description: string;
  iconUrl?: string;
  category: AchievementCategory;
  requirement: IAchievementRequirement;
  pointsReward: number;
  rarity: AchievementRarity;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementRequirementSchema = new Schema<IAchievementRequirement>(
  {
    type: {
      type: String,
      enum: ['streak', 'goal_count', 'workout_count', 'points_earned', 'level_reached', 'custom'],
      required: true,
    },
    value: { type: Number, required: true },
    comparison: {
      type: String,
      enum: ['gte', 'lte', 'eq'],
      default: 'gte',
    },
    customField: { type: String },
  },
  { _id: false }
);

const AchievementBadgeSchema = new Schema<IAchievementBadge>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    iconUrl: { type: String },
    category: {
      type: String,
      enum: ['consistency', 'performance', 'social', 'milestone'],
      required: true,
    },
    requirement: { type: AchievementRequirementSchema, required: true },
    pointsReward: { type: Number, required: true, default: 0 },
    rarity: {
      type: String,
      enum: ['common', 'rare', 'epic', 'legendary'],
      default: 'common',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        (ret as any).id = ret._id.toString();
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

AchievementBadgeSchema.index({ category: 1 });
AchievementBadgeSchema.index({ rarity: 1 });
AchievementBadgeSchema.index({ isActive: 1 });

export const AchievementBadge: Model<IAchievementBadge> =
  mongoose.models.AchievementBadge ||
  mongoose.model<IAchievementBadge>('AchievementBadge', AchievementBadgeSchema);