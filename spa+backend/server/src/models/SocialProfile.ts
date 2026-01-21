import mongoose, { Schema, Model } from 'mongoose';

export interface ISocialProfile {
  _id: string;
  userId: string;
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SocialProfileSchema = new Schema<ISocialProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    nickname: { type: String, required: true, unique: true, minlength: 3, maxlength: 20, index: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 160 },
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

export const SocialProfile: Model<ISocialProfile> =
  mongoose.models.SocialProfile || mongoose.model<ISocialProfile>('SocialProfile', SocialProfileSchema);