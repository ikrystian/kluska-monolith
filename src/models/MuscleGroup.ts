import mongoose, { Schema, Model, Document } from 'mongoose';
import { cacheKeys, invalidateOnWrite } from '../lib/server-cache';

export interface IMuscleGroup extends Document {
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
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// MuscleGroupSchema.index({ name: 1 }); - Removed as already unique in schema

// Cached reads of this collection (lib/server-cache) are dropped on every write.
invalidateOnWrite(MuscleGroupSchema, cacheKeys.collection('muscleGroups'));

export const MuscleGroup: Model<IMuscleGroup> =
  mongoose.models.MuscleGroup || mongoose.model<IMuscleGroup>('MuscleGroup', MuscleGroupSchema);

