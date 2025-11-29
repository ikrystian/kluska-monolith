import mongoose, { Schema, Model, Document } from 'mongoose';

export interface ISavedMeal extends Document {
    name: string;
    trainerId: string;
    ingredients: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        source: 'fatsecret' | 'manual';
        fatSecretId?: string;
        amount?: number; // in grams or serving units
        unit?: string;
    }[];
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
    createdAt: Date;
    updatedAt: Date;
}

const SavedMealSchema = new Schema<ISavedMeal>(
    {
        name: { type: String, required: true },
        trainerId: { type: String, required: true, index: true },
        ingredients: [{
            name: { type: String, required: true },
            calories: { type: Number, required: true },
            protein: { type: Number, required: true },
            carbs: { type: Number, required: true },
            fat: { type: Number, required: true },
            source: { type: String, enum: ['fatsecret', 'manual'], required: true },
            fatSecretId: { type: String },
            amount: { type: Number },
            unit: { type: String },
        }],
        totalCalories: { type: Number, required: true },
        totalProtein: { type: Number, required: true },
        totalCarbs: { type: Number, required: true },
        totalFat: { type: Number, required: true },
        category: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], default: 'Breakfast' },
    },
    {
        timestamps: true,
        toJSON: {
            transform: (_, ret) => {
                ret.id = ret._id.toString();
                delete (ret as any).__v;
                return ret;
            },
        },
    }
);

export const SavedMeal: Model<ISavedMeal> =
    mongoose.models.SavedMeal || mongoose.model<ISavedMeal>('SavedMeal', SavedMealSchema);
