import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IRunningSession extends Omit<Document, '_id'> {
  _id: string;
  ownerId: string;
  date: Date;
  distance: number; // in kilometers
  duration: number; // in minutes
  avgPace: number; // in min/km
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RunningSessionSchema = new Schema<IRunningSession>(
  {
    ownerId: { type: String, required: true },
    date: { type: Date, required: true },
    distance: { type: Number, required: true },
    duration: { type: Number, required: true },
    avgPace: { type: Number, required: true },
    notes: { type: String },
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

RunningSessionSchema.index({ ownerId: 1, date: -1 });

export const RunningSession: Model<IRunningSession> = 
  mongoose.models.RunningSession || mongoose.model<IRunningSession>('RunningSession', RunningSessionSchema);

