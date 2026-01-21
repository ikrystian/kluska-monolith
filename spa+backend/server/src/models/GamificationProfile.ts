import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IStreak {
  workout: number;
  goals: number;
  checkins: number;
  lastWorkoutDate?: Date;
  lastGoalDate?: Date;
  lastCheckinDate?: Date;
}

export interface IPointTransaction {
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'expired';
  source: 'goal_completion' | 'workout_completion' | 'streak_bonus' | 'achievement' | 'reward_redemption' | 'admin_adjustment';
  sourceId?: string;
  description: string;
  createdAt: Date;
}

export interface IGamificationProfile extends Omit<Document, '_id'> {
  _id: mongoose.Types.ObjectId;
  userId: string;
  totalPointsEarned: number;
  currentFitCoins: number;
  level: number;
  experiencePoints: number;
  streaks: IStreak;
  achievements: string[];
  redeemedRewards: {
    rewardId: string;
    redeemedAt: Date;
    fitCoinsCost: number;
  }[];
  pointTransactions: IPointTransaction[];
  rank?: number;
  createdAt: Date;
  updatedAt: Date;
}

const StreakSchema = new Schema<IStreak>(
  {
    workout: { type: Number, default: 0 },
    goals: { type: Number, default: 0 },
    checkins: { type: Number, default: 0 },
    lastWorkoutDate: { type: Date },
    lastGoalDate: { type: Date },
    lastCheckinDate: { type: Date },
  },
  { _id: false }
);

const PointTransactionSchema = new Schema<IPointTransaction>(
  {
    amount: { type: Number, required: true },
    type: {
      type: String,
      enum: ['earned', 'spent', 'bonus', 'expired'],
      required: true,
    },
    source: {
      type: String,
      enum: ['goal_completion', 'workout_completion', 'streak_bonus', 'achievement', 'reward_redemption', 'admin_adjustment'],
      required: true,
    },
    sourceId: { type: String },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const GamificationProfileSchema = new Schema<IGamificationProfile>(
  {
    userId: { type: String, required: true, unique: true },
    totalPointsEarned: { type: Number, default: 0 },
    currentFitCoins: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    experiencePoints: { type: Number, default: 0 },
    streaks: { type: StreakSchema, default: () => ({}) },
    achievements: [{ type: String }],
    redeemedRewards: [
      {
        rewardId: { type: String, required: true },
        redeemedAt: { type: Date, default: Date.now },
        fitCoinsCost: { type: Number, required: true },
      },
    ],
    pointTransactions: [PointTransactionSchema],
    rank: { type: Number },
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

// GamificationProfileSchema.index({ userId: 1 }); - Removed as already unique in schema
GamificationProfileSchema.index({ totalPointsEarned: -1 });
GamificationProfileSchema.index({ currentFitCoins: -1 });
GamificationProfileSchema.index({ level: -1 });

export const GamificationProfile: Model<IGamificationProfile> =
  mongoose.models.GamificationProfile ||
  mongoose.model<IGamificationProfile>('GamificationProfile', GamificationProfileSchema);