import mongoose, { Schema, Model } from 'mongoose';
import { RECIPE_LIMITS, RECIPE_MEAL_TYPES, type ArticleRecipe } from '../lib/article-recipe';

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
  /** Per-serving nutrition for recipe articles, so athletes can log the dish. */
  recipe?: ArticleRecipe | null;
  createdAt: Date;
  updatedAt: Date;
}

const RecipeSchema = new Schema<ArticleRecipe>(
  {
    dishName: { type: String, trim: true, maxlength: 120 },
    servings: { type: Number, min: 1, max: RECIPE_LIMITS.servings, default: 1 },
    prepMinutes: { type: Number, min: 0, max: RECIPE_LIMITS.prepMinutes },
    mealType: { type: String, enum: RECIPE_MEAL_TYPES },
    calories: { type: Number, required: true, min: 0, max: RECIPE_LIMITS.calories },
    protein: { type: Number, required: true, min: 0, max: RECIPE_LIMITS.protein },
    carbs: { type: Number, required: true, min: 0, max: RECIPE_LIMITS.carbs },
    fat: { type: Number, required: true, min: 0, max: RECIPE_LIMITS.fat },
  },
  { _id: false }
);

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
    recipe: { type: RecipeSchema, default: undefined },
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

// In dev, HMR re-runs this file but mongoose keeps the old compiled model, so
// schema changes (e.g. the recipe block) would be ignored until a restart.
if (process.env.NODE_ENV !== 'production' && mongoose.models.Article) {
  mongoose.deleteModel('Article');
}

export const Article: Model<IArticle> = mongoose.models.Article || mongoose.model<IArticle>('Article', ArticleSchema);

