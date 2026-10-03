import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IRunningCue {
  /** Seconds of moving time into the run when this cue should fire. */
  atSeconds: number;
  audioUrl: string;
  label?: string;
}

export interface IRunningProgram extends Document {
  _id: string;
  name: string;
  targetDistanceKm: number;
  description?: string;
  isActive: boolean;
  cues: IRunningCue[];
  createdAt: Date;
  updatedAt: Date;
}

const RunningCueSchema = new Schema<IRunningCue>(
  {
    atSeconds: { type: Number, required: true },
    audioUrl: { type: String, required: true },
    label: { type: String },
  },
  { _id: false }
);

const RunningProgramSchema = new Schema<IRunningProgram>(
  {
    name: { type: String, required: true },
    targetDistanceKm: { type: Number, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    cues: { type: [RunningCueSchema], default: [] },
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

RunningProgramSchema.index({ isActive: 1 });

export const RunningProgram: Model<IRunningProgram> =
  mongoose.models.RunningProgram || mongoose.model<IRunningProgram>('RunningProgram', RunningProgramSchema);
