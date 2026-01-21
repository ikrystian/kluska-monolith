import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IWorkoutPlan extends Omit<Document, '_id'> {
  _id: string;
  name: string;
  level: string;
  description?: string;
  trainerId: string;
  assignedAthleteIds: string[];
  stages: {
    name: string;
    weeks: {
      days: (string | object)[]; // Workout ID or 'Rest Day' or Workout object
    }[];
  }[];
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    name: { type: String, required: true },
    level: { type: String, required: true },
    description: { type: String },
    trainerId: { type: String, required: true },
    assignedAthleteIds: [{ type: String }],
    stages: [
      {
        name: { type: String, required: true },
        weeks: [
          {
            days: [{ type: Schema.Types.Mixed }], // Can be string ('Rest Day') or object (Workout)
          },
        ],
      },
    ],
    isDraft: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret) => {
        (ret as any).id = ret._id.toString();
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Indexes
WorkoutPlanSchema.index({ trainerId: 1 });
WorkoutPlanSchema.index({ assignedAthleteIds: 1 });
WorkoutPlanSchema.index({ name: 'text', description: 'text' });

export const WorkoutPlan: Model<IWorkoutPlan> =
  mongoose.models.WorkoutPlan || mongoose.model<IWorkoutPlan>('WorkoutPlan', WorkoutPlanSchema);
