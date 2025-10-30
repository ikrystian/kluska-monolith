import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IGoal extends Document {
  _id: string;
  ownerId: string;
  title: string;
  target: number;
  current: number;
  unit: string; // e.g., 'kg', 'reps', 'km', etc.
  deadline?: Date;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>(
  {
    ownerId: { type: String, required: true },
    title: { type: String, required: true },
    target: { type: Number, required: true },
    current: { type: Number, required: true, default: 0 },
    unit: { type: String, required: true },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
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

GoalSchema.index({ ownerId: 1, status: 1 });
GoalSchema.index({ deadline: 1 });

export const Goal: Model<IGoal> = 
  mongoose.models.Goal || mongoose.model<IGoal>('Goal', GoalSchema);

