import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IExercise extends Document {
  _id: string;
  name: string;
  muscleGroup: string;
  description?: string;
  image?: string;
  imageHint?: string;
  ownerId?: string;
  type: 'system' | 'custom';
  createdAt: Date;
  updatedAt: Date;
}

const ExerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true },
    muscleGroup: { type: String, required: true },
    description: { type: String },
    image: { type: String },
    imageHint: { type: String },
    ownerId: { type: String },
    type: { 
      type: String, 
      enum: ['system', 'custom'], 
      required: true,
      default: 'custom'
    },
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
ExerciseSchema.index({ muscleGroup: 1 });
ExerciseSchema.index({ ownerId: 1 });
ExerciseSchema.index({ type: 1 });
ExerciseSchema.index({ name: 'text' });

export const Exercise: Model<IExercise> = 
  mongoose.models.Exercise || mongoose.model<IExercise>('Exercise', ExerciseSchema);

