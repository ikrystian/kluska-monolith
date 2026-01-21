import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IExerciseMuscleGroup {
  name: string;
  imageUrl?: string;
}

export interface IExercise extends Omit<Document, '_id'> {
  _id: mongoose.Types.ObjectId;
  name: string;
  // New fields
  mainMuscleGroups: IExerciseMuscleGroup[];
  secondaryMuscleGroups: IExerciseMuscleGroup[];
  instructions?: string;
  mediaUrl?: string;
  // Legacy fields
  muscleGroup?: string;
  description?: string;
  image?: string;
  imageHint?: string;
  ownerId?: string;
  type: 'weight' | 'duration' | 'reps';
  createdAt: Date;
  updatedAt: Date;
}

const MuscleGroupSchema = new Schema<IExerciseMuscleGroup>({
  name: { type: String, required: true },
  imageUrl: { type: String }
});

const ExerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true },
    // New fields
    mainMuscleGroups: [MuscleGroupSchema],
    secondaryMuscleGroups: [MuscleGroupSchema],
    instructions: { type: String },
    mediaUrl: { type: String },
    // Legacy fields
    muscleGroup: { type: String },
    description: { type: String },
    image: { type: String },
    imageHint: { type: String },
    ownerId: { type: String },
    type: {
      type: String,
      enum: ['weight', 'duration', 'reps'],
      required: true,
      default: 'weight'
    },
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
ExerciseSchema.index({ muscleGroup: 1 });
ExerciseSchema.index({ ownerId: 1 });
ExerciseSchema.index({ type: 1 });
ExerciseSchema.index({ name: 'text' });

export const Exercise: Model<IExercise> =
  mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);

