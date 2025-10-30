import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IWorkoutDay {
  dayName: string;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: number;
    restTime?: number; // in seconds
    notes?: string;
  }[];
}

export interface IWorkoutPlan extends Document {
  _id: string;
  name: string;
  description?: string;
  trainerId: string;
  assignedAthleteIds: string[];
  workoutDays: IWorkoutDay[];
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
            exerciseName: { type: String, required: true },
            sets: { type: Number, required: true },
            reps: { type: Number, required: true },
            restTime: { type: Number },
            notes: { type: String },
          },
        ],
      },
    ],
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

