import mongoose, { Schema, Model } from 'mongoose';

export interface IPersonalRecord {
  _id: string;
  athleteId: string;
  exerciseId: string;
  exerciseName: string;
  type: 'max_weight' | 'max_reps' | 'max_duration';
  value: number;
  reps?: number;
  achievedAt: Date;
  workoutLogId: string;
}

const PersonalRecordSchema = new Schema<IPersonalRecord>(
  {
    athleteId: { type: String, required: true },
    exerciseId: { type: String, required: true },
    exerciseName: { type: String, required: true },
    type: { type: String, enum: ['max_weight', 'max_reps', 'max_duration'], required: true },
    value: { type: Number, required: true },
    reps: { type: Number },
    achievedAt: { type: Date, default: Date.now },
    workoutLogId: { type: String, required: true },
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

// Indexes for efficient queries
PersonalRecordSchema.index({ athleteId: 1 });
PersonalRecordSchema.index({ athleteId: 1, exerciseId: 1 });
PersonalRecordSchema.index({ athleteId: 1, achievedAt: -1 });

export const PersonalRecord: Model<IPersonalRecord> =
  mongoose.models.PersonalRecord || mongoose.model<IPersonalRecord>('PersonalRecord', PersonalRecordSchema);