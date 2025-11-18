import mongoose, { Schema, Model } from 'mongoose';

export interface INutritionGoal {
  _id: string;
  ownerId: string;
  trainerId?: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const NutritionGoalSchema = new Schema<INutritionGoal>(
  {
    ownerId: { type: String, required: true },
    trainerId: { type: String },
    dailyCalories: { type: Number, required: true },
    dailyProtein: { type: Number, required: true },
    dailyCarbs: { type: Number, required: true },
    dailyFat: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

NutritionGoalSchema.index({ ownerId: 1, isActive: 1 });
NutritionGoalSchema.index({ trainerId: 1 });

export const NutritionGoal: Model<INutritionGoal> =
  mongoose.models.NutritionGoal || mongoose.model<INutritionGoal>('NutritionGoal', NutritionGoalSchema);
