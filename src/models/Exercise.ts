import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMuscleGroup {
  name: string;
  imageUrl?: string;
}

export interface ISetupItem {
  group: string;
  value: string;
}

export interface IExercise extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  // New fields
  mainMuscleGroups: IMuscleGroup[];
  secondaryMuscleGroups: IMuscleGroup[];
  setup: ISetupItem[];
  instructions?: string;
  mediaUrl?: string;
  // Legacy fields
  muscleGroup?: string;
  description?: string;
  image?: string;
  imageHint?: string;
  ownerId?: string;
  /** 1–100: jak często ćwiczenie jest wybierane — po tym sortuje biblioteka (scripts/assign-exercise-popularity.ts). */
  popularity?: number;
  type: 'weight' | 'duration' | 'reps';
  createdAt: Date;
  updatedAt: Date;
}

const MuscleGroupSchema = new Schema<IMuscleGroup>({
  name: { type: String, required: true },
  imageUrl: { type: String }
});

const SetupItemSchema = new Schema<ISetupItem>({
  group: { type: String, required: true },
  value: { type: String, required: true }
});

const ExerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true },
    // New fields
    mainMuscleGroups: [MuscleGroupSchema],
    secondaryMuscleGroups: [MuscleGroupSchema],
    setup: [SetupItemSchema],
    instructions: { type: String },
    mediaUrl: { type: String },
    // Legacy fields
    muscleGroup: { type: String },
    description: { type: String },
    image: { type: String },
    imageHint: { type: String },
    ownerId: { type: String },
    popularity: { type: Number, min: 0, max: 100 },
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
        ret.id = ret._id.toString();
        delete ret.__v;
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
// Domyślna kolejność biblioteki: najpopularniejsze najpierw.
ExerciseSchema.index({ popularity: -1, name: 1, _id: 1 });

export const Exercise: Model<IExercise> =
  mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);

