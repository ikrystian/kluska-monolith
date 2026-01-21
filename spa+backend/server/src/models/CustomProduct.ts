import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomProduct extends Omit<Document, '_id'> {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    unit: string;
    trainerId: string;
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
        trainerId: { type: String, required: true, index: true },
    },
    { timestamps: true }
);

// Create a text index on the name field for search functionality
CustomProductSchema.index({ name: 'text' });

const CustomProduct: Model<ICustomProduct> =
    mongoose.models.CustomProduct || mongoose.model<ICustomProduct>('CustomProduct', CustomProductSchema);

export default CustomProduct;
