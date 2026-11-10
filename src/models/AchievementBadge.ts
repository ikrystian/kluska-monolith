import mongoose, { Schema, Model, Document } from 'mongoose';

export type AchievementCategory = 'consistency' | 'performance' | 'social' | 'milestone';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const REQUIREMENT_TYPES = [
  'streak',
  'goal_count',
  'workout_count',
  'points_earned',
  'level_reached',
  'total_volume',
  'personal_record_count',
  'streak_days',
  'run_distance',
  'custom',
] as const;
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

export interface IAchievementRequirement {
  type: RequirementType;
  value: number;
  comparison: 'gte' | 'lte' | 'eq';
  customField?: string;
}

export interface IAchievementBadge extends Document {
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
      enum: REQUIREMENT_TYPES,
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
        ret.id = ret._id.toString();
        delete ret.__v;
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