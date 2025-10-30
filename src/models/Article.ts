import mongoose, { Schema, Model } from 'mongoose';

export interface IArticle {
  _id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  category: string;
  status: 'published' | 'draft';
  coverImageUrl?: string;
  imageHint?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ArticleSchema = new Schema<IArticle>(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    category: { type: String, required: true },
    status: { type: String, enum: ['published', 'draft'], default: 'draft' },
    coverImageUrl: { type: String },
    imageHint: { type: String },
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

ArticleSchema.index({ status: 1 });
ArticleSchema.index({ category: 1 });
ArticleSchema.index({ authorId: 1 });

export const Article: Model<IArticle> = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);

