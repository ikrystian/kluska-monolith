import mongoose, { Schema, Model } from 'mongoose';

export interface ISocialPost {
  _id: string;
  authorId: string;
  authorNickname: string;
  imageUrl: string;
  description: string;
  likes: string[];
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SocialPostSchema = new Schema<ISocialPost>(
  {
    authorId: { type: String, required: true },
    authorNickname: { type: String, required: true },
    imageUrl: { type: String, required: true },
    description: { type: String, maxlength: 500, default: '' },
    likes: [{ type: String }],
    likesCount: { type: Number, default: 0 },
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

// Indexes for efficient queries
SocialPostSchema.index({ createdAt: -1 }); // For feed pagination
SocialPostSchema.index({ authorId: 1 }); // For user's posts
SocialPostSchema.index({ authorId: 1, createdAt: -1 }); // For user's recent posts

// Pre-save middleware to update likesCount
SocialPostSchema.pre('save', function (next) {
  this.likesCount = this.likes.length;
  next();
});

export const SocialPost: Model<ISocialPost> =
  mongoose.models.SocialPost || mongoose.model<ISocialPost>('SocialPost', SocialPostSchema);