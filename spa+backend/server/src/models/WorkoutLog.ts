import mongoose, { Schema, Model, Document } from 'mongoose';
import { IExercise } from './Exercise';

// Define the nested structures
export interface IWorkoutSet {
  number: number;
  type: string; // SetType enum
  reps: number;
  weight: number;
  restTimeSeconds: number;
  duration?: number;
  completed: boolean;
}

export interface IExerciseSeries {
  exerciseId: string; // Keep ID for reference
  exercise: IExercise; // Embed full exercise snapshot
  tempo: string;
  tip?: string;
  sets: IWorkoutSet[];
}

export interface IWorkoutLog extends Omit<Document, '_id'> {
  _id: mongoose.Types.ObjectId;
  athleteId: string;
  workoutName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in minutes
  exercises: IExerciseSeries[];
  photoURL?: string;
  status: 'in-progress' | 'completed' | 'cancelled';
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutSetSchema = new Schema<IWorkoutSet>({
  number: { type: Number, required: true },
  type: { type: String, required: true },
  reps: { type: Number, default: 0 },
  weight: { type: Number, default: 0 },
  restTimeSeconds: { type: Number, default: 60 },
  duration: { type: Number },
  completed: { type: Boolean, default: false }
});

// We need to define a schema for the embedded exercise snapshot
// We can reuse the schema definition from Exercise.ts or define a subset.
// Since we want a snapshot, let's define a flexible schema or import it.
// For simplicity and to avoid circular deps, let's define a schema that matches IExercise structure loosely or use Mixed.
// But better to be explicit.
const ExerciseSnapshotSchema = new Schema({
  _id: { type: String }, // Store as string or ObjectId
  name: { type: String, required: true },
  mainMuscleGroups: [{ name: String, imageUrl: String }],
  secondaryMuscleGroups: [{ name: String, imageUrl: String }],
  instructions: String,
  mediaUrl: String,
  muscleGroup: String, // Legacy
  type: String
}, { _id: false }); // Don't create a separate _id for the snapshot if we store the original ID in _id field

const ExerciseSeriesSchema = new Schema<IExerciseSeries>({
  exerciseId: { type: String, required: true },
  exercise: { type: ExerciseSnapshotSchema, required: true },
  tempo: { type: String, default: "2-0-2-0" },
  tip: { type: String },
  sets: [WorkoutSetSchema]
});

const WorkoutLogSchema = new Schema<IWorkoutLog>(
  {
    athleteId: { type: String, required: true },
    workoutName: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number },
    exercises: [ExerciseSeriesSchema],
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
      transform: (_, ret: any) => {
        (ret as any).id = ret._id.toString();
        delete (ret as any).__v;
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

