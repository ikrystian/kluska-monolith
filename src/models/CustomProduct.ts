import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomProduct extends Document {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    unit: string;
    trainerId?: string;
    source: 'manual' | 'ai';
    createdAt: Date;
    updatedAt: Date;
}

const CustomProductSchema: Schema = new Schema(
    {
        name: { type: String, required: true },
        calories: { type: Number, required: true },
        protein: { type: Number, required: true },
        carbs: { type: Number, required: true },
        fat: { type: Number, required: true },
        unit: { type: String, default: 'g' },
        // AI-sourced products are global (no trainerId) so every trainer can reuse them
        trainerId: { type: String, index: true },
        source: { type: String, enum: ['manual', 'ai'], default: 'manual' },
    },
    { timestamps: true }
);

// Create a text index on the name field for search functionality
CustomProductSchema.index({ name: 'text' });

const CustomProduct: Model<ICustomProduct> =
    mongoose.models.CustomProduct || mongoose.model<ICustomProduct>('CustomProduct', CustomProductSchema);

export default CustomProduct;
