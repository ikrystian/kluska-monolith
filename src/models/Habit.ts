import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IHabit extends Document {
    _id: mongoose.Types.ObjectId;
    ownerId: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency: 'daily' | 'weekly';
    targetDaysPerWeek?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const HabitSchema = new Schema<IHabit>(
    {
        ownerId: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String },
        icon: { type: String, default: 'CheckSquare' },
        color: { type: String, default: '#10b981' },
        frequency: {
            type: String,
            enum: ['daily', 'weekly'],
            default: 'daily',
        },
        targetDaysPerWeek: { type: Number, default: 7 },
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
