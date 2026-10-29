import mongoose, { Schema, Model, Document } from 'mongoose';

export type RunningCueTrigger = 'time' | 'distance';

export interface IRunningCue {
  triggerType: RunningCueTrigger;
  /** Seconds of moving time (triggerType 'time') or metres covered (triggerType 'distance'). */
  value: number;
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
    triggerType: { type: String, enum: ['time', 'distance'], required: true },
    value: { type: Number, required: true },
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
