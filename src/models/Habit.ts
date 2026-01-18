import mongoose, { Schema, Model, Document } from 'mongoose';

export type FrequencyType = 'daily' | 'specific_days' | 'every_x_days';

export interface IHabitFrequency {
    type: FrequencyType;
    daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
    repeatEvery?: number; // For every_x_days, e.g., 2 = every 2 days
}

export interface IHabit extends Document {
    _id: mongoose.Types.ObjectId;
    ownerId: string;
    name: string;
    description?: string;
    icon?: string; // Emoji icon, e.g., '💪'
    color?: string;
    frequency: IHabitFrequency;
    duration?: number; // Optional goal in days (null = infinite)
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const HabitFrequencySchema = new Schema<IHabitFrequency>(
    {
        type: {
            type: String,
            enum: ['daily', 'specific_days', 'every_x_days'],
            default: 'daily',
        },
        daysOfWeek: [{ type: Number }],
        repeatEvery: { type: Number },
    },
    { _id: false }
);

const HabitSchema = new Schema<IHabit>(
    {
        ownerId: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        icon: { type: String, default: '💪' },
        color: { type: String, default: '#10b981' },
        frequency: { type: HabitFrequencySchema, default: () => ({ type: 'daily' }) },
        duration: { type: Number },
        isActive: { type: Boolean, default: true },
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

HabitSchema.index({ ownerId: 1, isActive: 1 });
HabitSchema.index({ createdAt: -1 });

export const Habit: Model<IHabit> =
    mongoose.models.Habit || mongoose.model<IHabit>('Habit', HabitSchema);
