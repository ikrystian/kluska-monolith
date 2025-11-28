import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IWorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  sets: {
    reps: number;
    weight?: number;
    completed: boolean;
  }[];
  duration?: number;
}

export interface IWorkoutLog extends Document {
  _id: string;
  athleteId: string;
  workoutName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  exercises: IWorkoutExercise[];
  photoURL?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutLogSchema = new Schema<IWorkoutLog>(
  {
    athleteId: { type: String, required: true },
    workoutName: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number },
    exercises: [
      {
        exerciseId: { type: String, required: true },
        exerciseName: { type: String, required: true },
        sets: [
          {
            reps: { type: Number, required: true },
            weight: { type: Number },
            completed: { type: Boolean, default: false },
          },
        ],
        duration: { type: Number },
      },
    ],
    photoURL: { type: String },
    status: {
      type: String,
      enum: ['in-progress', 'completed', 'cancelled'],
      default: 'in-progress',
    },
    feedback: { type: String },
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
WorkoutLogSchema.index({ athleteId: 1, endTime: -1 });
WorkoutLogSchema.index({ status: 1 });
WorkoutLogSchema.index({ startTime: -1 });

export const WorkoutLog: Model<IWorkoutLog> =
  mongoose.models.WorkoutLog || mongoose.model<IWorkoutLog>('WorkoutLog', WorkoutLogSchema);

