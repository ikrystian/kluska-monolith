import mongoose, { Schema, Model, Document } from 'mongoose';

export type GoalDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GoalCategory = 'strength' | 'cardio' | 'flexibility' | 'weight' | 'nutrition' | 'habit' | 'other';

export const GOAL_METRICS = [
  'manual',
  'total_volume',
  'workout_count',
  'exercise_max_weight',
  'body_weight',
  'run_distance',
  'streak_days',
  'habit_days',
] as const;
/** `manual` = postęp wpisywany ręcznie; pozostałe liczą się same z danych. */
export type GoalMetric = (typeof GOAL_METRICS)[number];

export interface IGoalProgressPoint {
  /** `YYYY-MM-DD` */
  date: string;
  value: number;
}

export interface IGoal extends Document {
  _id: mongoose.Types.ObjectId;
  ownerId: string;
  title: string;
  description?: string;
  target: number;
  current: number;
  unit: string; // e.g., 'kg', 'reps', 'km', etc.
  deadline?: Date;
  status: 'active' | 'completed' | 'cancelled';
  // Gamification fields
  difficulty: GoalDifficulty;
  category: GoalCategory;
  assignedByTrainerId?: string;
  basePoints: number;
  trainerApproved: boolean;
  completedAt?: Date;
  pointsAwarded?: number;
  metric: GoalMetric;
  /** Ćwiczenie dla celu `exercise_max_weight`. */
  exerciseId?: string;
  exerciseName?: string;
  /** `down` = cel polega na zejściu do wartości (np. waga ciała). */
  direction: 'up' | 'down';
  /** Wartość metryki w chwili założenia celu. */
  startValue: number;
  startDate?: Date;
  progressLog: IGoalProgressPoint[];
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    target: { type: Number, required: true },
    current: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    // Gamification fields
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'expert'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['strength', 'cardio', 'flexibility', 'weight', 'nutrition', 'habit', 'other'],
      default: 'other',
    },
    assignedByTrainerId: { type: String },
    basePoints: { type: Number, default: 100 },
    trainerApproved: { type: Boolean, default: false },
    completedAt: { type: Date },
    pointsAwarded: { type: Number },
    metric: { type: String, enum: GOAL_METRICS, default: 'manual' },
    exerciseId: { type: String },
    exerciseName: { type: String },
    direction: { type: String, enum: ['up', 'down'], default: 'up' },
    startValue: { type: Number, default: 0 },
    startDate: { type: Date },
    progressLog: [{ _id: false, date: { type: String, required: true }, value: { type: Number, required: true } }],
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

GoalSchema.index({ ownerId: 1, status: 1 });
GoalSchema.index({ deadline: 1 });
GoalSchema.index({ assignedByTrainerId: 1 });
GoalSchema.index({ difficulty: 1 });
GoalSchema.index({ category: 1 });

export const Goal: Model<IGoal> =
  mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);

