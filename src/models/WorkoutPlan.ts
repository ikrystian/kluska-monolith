import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IWorkoutDay {
  dayName: string;
  exercises: {
    exerciseId: string;
    sets: {
      reps: number;
      weight?: number;
    }[];
    duration?: number; // in seconds for time-based exercises
  }[];
}

export interface IWorkoutPlan extends Document {
  _id: string;
  name: string;
  description?: string;
  trainerId: string;
  assignedAthleteIds: string[];
  workoutDays: IWorkoutDay[];
  isDraft: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    name: { type: String, required: true },
    description: { type: String },
    trainerId: { type: String, required: true },
    assignedAthleteIds: [{ type: String }],
    workoutDays: [
      {
        dayName: { type: String, required: true },
        exercises: [
          {
            exerciseId: { type: String, required: true },
            sets: [
              {
                reps: { type: Number, required: true },
                weight: { type: Number },
              },
            ],
            duration: { type: Number },
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
        ret.id = ret._id.toString();
        delete ret.__v;
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

