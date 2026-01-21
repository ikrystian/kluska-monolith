import mongoose, { Schema, Model } from 'mongoose';

export interface IMeal {
  _id: string;
  ownerId: string;
  trainerId?: string;
  date: Date;
  type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  foodItems: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const MealSchema = new Schema<IMeal>(
  {
    ownerId: { type: String, required: true },
    trainerId: { type: String },
    date: { type: Date, required: true },
    type: { type: String, enum: ['Breakfast', 'Lunch', 'Dinner', 'Snack'], required: true },
    foodItems: [{
      name: { type: String, required: true },
      calories: { type: Number, required: true },
      protein: { type: Number, required: true },
      carbs: { type: Number, required: true },
      fat: { type: Number, required: true },
    }],
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

MealSchema.index({ ownerId: 1, date: -1 });
MealSchema.index({ trainerId: 1, date: -1 });

export const Meal: Model<IMeal> =
  mongoose.models.Meal || mongoose.model<IMeal>('Meal', MealSchema);
