import mongoose, { Schema, Model, Document } from 'mongoose';
import { DISH_CATEGORIES, type DishCategory } from '../lib/meal-catalog';

export interface ISavedMeal extends Document {
    name: string;
    description?: string;
    /** Trainer/admin user id, or 'system' for seeded catalogue meals. */
    trainerId: string;
    /** Public meals can be found and logged by every user. */
    isPublic: boolean;
    dishCategory: DishCategory;
    ingredients: {
        name: string;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        source: 'fatsecret' | 'manual' | 'ai';
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
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, maxlength: 500 },
        trainerId: { type: String, required: true, index: true },
        isPublic: { type: Boolean, default: false, index: true },
        dishCategory: { type: String, enum: DISH_CATEGORIES, default: 'other', index: true },
        ingredients: [{
            name: { type: String, required: true },
            calories: { type: Number, required: true },
            protein: { type: Number, required: true },
            carbs: { type: Number, required: true },
            fat: { type: Number, required: true },
            source: { type: String, enum: ['fatsecret', 'manual', 'ai'], required: true },
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

// In dev, HMR re-runs this file but mongoose keeps the old compiled model, so
// schema changes (e.g. new enum values) would be ignored until a restart.
if (process.env.NODE_ENV !== 'production' && mongoose.models.SavedMeal) {
  mongoose.deleteModel('SavedMeal');
}

export const SavedMeal: Model<ISavedMeal> =
  mongoose.models.SavedMeal || mongoose.model<ISavedMeal>('SavedMeal', SavedMealSchema);
