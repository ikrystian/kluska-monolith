import mongoose, { Schema, Model } from 'mongoose';

export interface IArticleCategory {
    _id: string;
    name: string;
}

const ArticleCategorySchema = new Schema<IArticleCategory>(
    {
        name: { type: String, required: true, unique: true },
    },
    {
        toJSON: {
            transform: (_, ret) => {
                ret.id = ret._id.toString();
                delete ret.__v;
                return ret;
            },
        },
    }
);

export const ArticleCategory: Model<IArticleCategory> =
    mongoose.models.ArticleCategory || mongoose.model<IArticleCategory>('ArticleCategory', ArticleCategorySchema);
