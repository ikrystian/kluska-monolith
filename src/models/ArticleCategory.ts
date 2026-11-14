import mongoose, { Schema, Model } from 'mongoose';
import { cacheKeys, invalidateOnWrite } from '../lib/server-cache';

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

// Cached reads of this collection (lib/server-cache) are dropped on every write.
invalidateOnWrite(ArticleCategorySchema, cacheKeys.collection('articleCategories'));

export const ArticleCategory: Model<IArticleCategory> =
    mongoose.models.ArticleCategory || mongoose.model<IArticleCategory>('ArticleCategory', ArticleCategorySchema);
