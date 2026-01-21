import mongoose, { Schema, Model, Document } from 'mongoose';

export type RewardCategory = 'digital' | 'physical' | 'experience';
export type RewardTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type RewardAvailability = 'always' | 'limited' | 'seasonal';

export interface IReward extends Omit<Document, '_id'> {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: RewardCategory;
  fitCoinCost: number;
  tier: RewardTier;
  availability: RewardAvailability;
  maxRedemptions?: number;
  currentRedemptions: number;
  imageUrl?: string;
  isActive: boolean;
  validFrom?: Date;
  validUntil?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const RewardSchema = new Schema<IReward>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['digital', 'physical', 'experience'],
      required: true,
    },
    fitCoinCost: { type: Number, required: true, min: 1 },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      required: true,
    },
    availability: {
      type: String,
      enum: ['always', 'limited', 'seasonal'],
      default: 'always',
    },
    maxRedemptions: { type: Number },
    currentRedemptions: { type: Number, default: 0 },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
    validFrom: { type: Date },
    validUntil: { type: Date },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_, ret: any) => {
        (ret as any).id = ret._id.toString();
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

RewardSchema.index({ category: 1 });
RewardSchema.index({ tier: 1 });
RewardSchema.index({ fitCoinCost: 1 });
RewardSchema.index({ isActive: 1 });

export const Reward: Model<IReward> =
  mongoose.models.Reward || mongoose.model<IReward>('Reward', RewardSchema);