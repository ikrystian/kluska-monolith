import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IMuscleGroup extends Omit<Document, '_id'> {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  imageHint?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MuscleGroupSchema = new Schema<IMuscleGroup>(
  {
    name: { type: String, required: true, unique: true },
    description: { type: String },
    imageUrl: { type: String },
    imageHint: { type: String },
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

// MuscleGroupSchema.index({ name: 1 }); - Removed as already unique in schema

export const MuscleGroup: Model<IMuscleGroup> =
  mongoose.models.MuscleGroup || mongoose.model<IMuscleGroup>('MuscleGroup', MuscleGroupSchema);

