import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IRunningTrackPoint {
  lat: number;
  lng: number;
  /** Epoch ms when the fix was taken. */
  at: number;
  /** Altitude in metres, when the device/provider reports one. */
  alt?: number;
}

export interface IRunningSession extends Document {
  _id: string;
  ownerId: string;
  date: Date;
  distance: number; // in kilometers
  duration: number; // in minutes
  avgPace: number; // in min/km
  notes?: string;
  /** Encoded route from the in-app GPS tracker; absent for manually entered runs. */
  polyline?: string;
  /** Raw per-second GPS samples backing `polyline`. */
  points?: IRunningTrackPoint[];
  /** Training selected for this run, if any. */
  programId?: string;
  /** Snapshot of the program's name at run time, so history survives edits/deletion. */
  programName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RunningTrackPointSchema = new Schema<IRunningTrackPoint>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    at: { type: Number, required: true },
    alt: { type: Number },
  },
  { _id: false }
);

const RunningSessionSchema = new Schema<IRunningSession>(
  {
    ownerId: { type: String, required: true },
    date: { type: Date, required: true },
    distance: { type: Number, required: true },
    duration: { type: Number, required: true },
    avgPace: { type: Number, required: true },
    notes: { type: String },
    polyline: { type: String },
    points: { type: [RunningTrackPointSchema], default: undefined },
    programId: { type: String },
    programName: { type: String },
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

RunningSessionSchema.index({ ownerId: 1, date: -1 });

export const RunningSession: Model<IRunningSession> = 
  mongoose.models.RunningSession || mongoose.model<IRunningSession>('RunningSession', RunningSessionSchema);

