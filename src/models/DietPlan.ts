import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IDietDay {
    dayNumber: number;
    meals: {
        savedMealId: string; // Reference to SavedMeal
        type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
        time?: string; // Optional time like "08:00"
    }[];
}

export interface IDietPlan extends Document {
    name: string;
    trainerId: string;
    description?: string;
    days: IDietDay[];
    createdAt: Date;
    updatedAt: Date;
}

const DietDaySchema = new Schema<IDietDay>({
    dayNumber: { type: Number, required: true },
    meals: [{
        savedMealId: { type: String, required: true },
        type: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], required: true },
        time: { type: String },
    }],
}, { _id: false });

const DietPlanSchema = new Schema<IDietPlan>(
    {
        name: { type: String, required: true },
        trainerId: { type: String, required: true, index: true },
        description: { type: String },
        days: [DietDaySchema],
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

export const DietPlan: Model<IDietPlan> =
    mongoose.models.DietPlan || mongoose.model<IDietPlan>('DietPlan', DietPlanSchema);
