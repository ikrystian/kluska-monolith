import mongoose, { Schema, Model } from 'mongoose';

export type FoodDiaryMealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface IFoodDiaryEntry {
  _id: string;
  ownerId: string;
  /** Local day of the athlete as YYYY-MM-DD (client-provided, timezone-free). */
  date: string;
  mealType: FoodDiaryMealType;
  name: string;
  /** Eaten amount in `unit` (grams by default). */
  amount: number;
  unit: string;
  /** Macros already computed for `amount` (not per 100 g). */
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  productId?: string;
  barcode?: string;
  source: 'search' | 'barcode' | 'manual';
  createdAt?: Date;
  updatedAt?: Date;
}

const FoodDiaryEntrySchema = new Schema<IFoodDiaryEntry>(
  {
    ownerId: { type: String, required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    mealType: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], required: true },
    name: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    unit: { type: String, default: 'g' },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    productId: { type: String },
    barcode: { type: String },
    source: { type: String, enum: ['search', 'barcode', 'manual'], default: 'search' },
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

FoodDiaryEntrySchema.index({ ownerId: 1, date: 1 });

export const FoodDiaryEntry: Model<IFoodDiaryEntry> =
  mongoose.models.FoodDiaryEntry || mongoose.model<IFoodDiaryEntry>('FoodDiaryEntry', FoodDiaryEntrySchema);
