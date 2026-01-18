import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IHabitLog extends Document {
    _id: mongoose.Types.ObjectId;
    habitId: string;
    ownerId: string;
    date: string; // ISO format YYYY-MM-DD
    completed: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const HabitLogSchema = new Schema<IHabitLog>(
    {
        habitId: { type: String, required: true },
        ownerId: { type: String, required: true },
        date: { type: String, required: true },
        completed: { type: Boolean, default: true },
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

// Compound index for efficient querying
HabitLogSchema.index({ habitId: 1, date: 1 }, { unique: true });
HabitLogSchema.index({ ownerId: 1, date: 1 });
HabitLogSchema.index({ habitId: 1, ownerId: 1 });

export const HabitLog: Model<IHabitLog> =
    mongoose.models.HabitLog || mongoose.model<IHabitLog>('HabitLog', HabitLogSchema);
