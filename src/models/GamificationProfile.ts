import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IStreak {
  workout: number;
  goals: number;
  checkins: number;
  lastWorkoutDate?: Date;
  lastGoalDate?: Date;
  lastCheckinDate?: Date;
}

export const POINT_SOURCES = [
  'goal_completion',
  'workout_completion',
  'run_completion',
  'challenge_win',
  'personal_record',
  'quest',
  'streak_bonus',
  'achievement',
  'reward_redemption',
  'admin_adjustment',
  'pet_chest',
  'pet_purchase',
] as const;
export type PointSource = (typeof POINT_SOURCES)[number];

/** Osiągnięcie z katalogu w kodzie (`lib/gamification/catalog.ts`). */
export interface IUnlockedAchievement {
  key: string;
  unlockedAt: Date;
  /** Kiedy użytkownik zobaczył celebrację; brak = jeszcze do pokazania. */
  seenAt?: Date;
}

export interface IWeeklyQuest {
  id: string;
  target: number;
  xp: number;
  rewardedAt?: Date;
}

export interface IWeeklyQuests {
  /** Poniedziałek tygodnia, `YYYY-MM-DD`. */
  weekKey: string;
  items: IWeeklyQuest[];
}

export interface IPointTransaction {
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'expired';
  source: PointSource;
  sourceId?: string;
  description: string;
  createdAt: Date;
}

export interface IGamificationProfile extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  totalPointsEarned: number;
  currentFitCoins: number;
  level: number;
  experiencePoints: number;
  streaks: IStreak;
  /** Id odznak z kolekcji `achievementbadges` (panel admina). */
  achievements: string[];
  /** Osiągnięcia z katalogu w kodzie. */
  unlocked: IUnlockedAchievement[];
  /** Snapshot `AthleteStats` — odczyt ekranu bez pełnej agregacji. */
  lifetimeStats?: Record<string, any>;
  statsUpdatedAt?: Date;
  quests?: IWeeklyQuests;
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
      enum: POINT_SOURCES,
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
    unlocked: [
      {
        _id: false,
        key: { type: String, required: true },
        unlockedAt: { type: Date, default: Date.now },
        seenAt: { type: Date },
      },
    ],
    lifetimeStats: { type: Schema.Types.Mixed },
    statsUpdatedAt: { type: Date },
    quests: {
      weekKey: { type: String },
      items: [
        {
          _id: false,
          id: { type: String, required: true },
          target: { type: Number, required: true },
          xp: { type: Number, required: true },
          rewardedAt: { type: Date },
        },
      ],
    },
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
        ret.id = ret._id.toString();
        delete ret.__v;
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